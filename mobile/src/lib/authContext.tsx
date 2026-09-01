import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "../api/types";
import { getMe, login as apiLogin, setAuthToken, setUnauthorizedHandler, signup as apiSignup } from "../api/client";
import { deleteSecureItem, getSecureItem, setSecureItem } from "./secureStorage";

// expo-secure-store keys must be alphanumeric plus "." "-" "_" only (no
// colon) -- stricter than AsyncStorage, which is what the old "pakka:..."
// naming convention was written for. This only surfaces on a real device
// (the web fallback via localStorage has no such restriction), which is
// why it wasn't caught in web-only testing.
const TOKEN_KEY = "pakka.authToken";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setStatus("signedOut");
    try {
      await deleteSecureItem(TOKEN_KEY);
    } catch {
      // best-effort -- there's nothing more useful to do if the secure store write fails
    }
  }, []);

  // Restore a saved session on launch, and react to a token going stale
  // (expired/invalid) at any point during use, not just at launch.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });

    (async () => {
      const token = await getSecureItem(TOKEN_KEY).catch(() => null);
      if (!token) {
        setStatus("signedOut");
        return;
      }
      setAuthToken(token);
      try {
        const me = await getMe();
        setUser(me);
        setStatus("signedIn");
      } catch {
        await signOut();
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: signedInUser, token } = await apiLogin(email, password);
    await setSecureItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(signedInUser);
    setStatus("signedIn");
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string | null) => {
    const { user: newUser, token } = await apiSignup(email, password, name);
    await setSecureItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(newUser);
    setStatus("signedIn");
  }, []);

  const refreshUser = useCallback((updated: User) => setUser(updated), []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut, refreshUser }),
    [status, user, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
