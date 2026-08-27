import jwt from "jsonwebtoken";

// Required, not optional-with-a-fallback: a guessable/default secret would let
// anyone forge tokens for any account. `tsx watch` restarts on every file
// save, so this also can't be a randomly-generated-at-boot value -- that
// would silently log every user out on every dev save. Set once in .env.
function requireSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      "JWT_SECRET is not set. Add a long random value to backend/.env, e.g.:\n" +
        "  JWT_SECRET=$(openssl rand -hex 32)\n" +
        "(generate one with: openssl rand -hex 32)",
    );
  }
  return value;
}

// Resolved once at module load (not lazily per-call) so a missing secret
// fails loudly at startup rather than on the first login attempt -- and so
// TypeScript can narrow this to a definite `string` for every use below
// (narrowing an outer `const` doesn't otherwise persist into nested
// functions/closures).
const JWT_SECRET: string = requireSecret();

const TOKEN_TTL = "30d";

export interface TokenPayload {
  userId: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/** Returns the decoded payload, or null for a missing, malformed, or expired token -- never throws. */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded !== "object" || decoded === null || typeof decoded.userId !== "string") {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}
