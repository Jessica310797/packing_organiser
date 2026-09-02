import { Platform } from "react-native";
import type {
  IngestPhotoResult,
  InventoryItem,
  PackingList,
  PackingListCategory,
  PackingListItem,
  PackingListSuggestion,
  Photo,
  RecommendedItem,
  ReviewCandidate,
  ReviewResolution,
  Trip,
  User,
  WardrobeItem,
  WardrobePhotoResult,
} from "./types";

// Set with a `.env` file (see `.env.example`) — must point at wherever the
// backend is reachable from your phone, not "localhost" (that means the
// phone itself when the app is running on a device).
//
// Trailing slashes are stripped: every path below starts with "/", so a
// trailing slash here would produce a double-slash URL (".../​/trips") that
// Express's router 404s on -- easy to introduce when copying a URL straight
// out of a browser address bar or the Codespaces Ports tab.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Turns a relative API path (e.g. a Photo's `url`) into a fetchable absolute URL. */
export const apiUrl = (relativePath: string) => `${API_BASE_URL}${relativePath}`;

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Set by AuthProvider whenever the signed-in state changes -- api/client.ts
// is a plain module (not a component), so this is the simplest way for
// every request to know the current session without threading a token
// through every single API function's call sites.
let authToken: string | null = null;
export function setAuthToken(token: string | null): void {
  authToken = token;
}

// Also set by AuthProvider: called once, on any 401, so the app can drop
// back to the login screen instead of leaving stale, now-invalid state
// around (e.g. an expired 30-day token).
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.();
    const message =
      body && typeof body === "object" && "error" in body
        ? JSON.stringify((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };
}

// --- auth ------------------------------------------------------------------

export interface AuthResult {
  user: User;
  token: string;
}

export const signup = (email: string, password: string, name: string | null) =>
  request<AuthResult>("/auth/signup", json("POST", { email, password, name: name || undefined }));

export const login = (email: string, password: string) =>
  request<AuthResult>("/auth/login", json("POST", { email, password }));

export const getMe = () => request<User>("/auth/me");

export const updateMyName = (name: string) => request<User>("/auth/me", json("PATCH", { name }));

// --- trips ---------------------------------------------------------------

export interface CreateTripInput {
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  activities: string[];
  packingTarget?: number | null;
}

export const listTrips = () => request<Trip[]>("/trips");
export const getTrip = (tripId: string) => request<Trip>(`/trips/${tripId}`);
export const createTrip = (input: CreateTripInput) => request<Trip>("/trips", json("POST", input));
export const getPhotos = (tripId: string) => request<Photo[]>(`/trips/${tripId}/photos`);

export interface TripWeather {
  available: boolean;
  tempC?: number;
  condition?: string;
  emoji?: string;
}
export const getWeather = (tripId: string) => request<TripWeather>(`/trips/${tripId}/weather`);

export interface DestinationPhoto {
  available: boolean;
  url?: string;
}
export const getDestinationPhoto = (tripId: string) =>
  request<DestinationPhoto>(`/trips/${tripId}/destination-photo`);

export const getRecommendations = (tripId: string) =>
  request<RecommendedItem[]>(`/trips/${tripId}/recommendations`);

// --- inventory -------------------------------------------------------------

export const getInventory = (tripId: string) =>
  request<InventoryItem[]>(`/trips/${tripId}/inventory`);

export interface AddItemInput {
  name: string;
  category: string | null;
  quantity: number;
}

export const addManualItem = (tripId: string, input: AddItemInput & { packed?: boolean }) =>
  request<InventoryItem>(`/trips/${tripId}/inventory`, json("POST", input));

export const editItem = (
  tripId: string,
  itemId: string,
  patch: Partial<{ name: string; category: string | null; quantity: number; packed: boolean }>,
) => request<InventoryItem>(`/trips/${tripId}/inventory/${itemId}`, json("PATCH", patch));

export const removeItem = (tripId: string, itemId: string) =>
  request<void>(`/trips/${tripId}/inventory/${itemId}`, { method: "DELETE" });

// --- review queue -----------------------------------------------------

export const getReview = (tripId: string) =>
  request<ReviewCandidate[]>(`/trips/${tripId}/review`);

export const resolveReview = (candidateId: string, resolution: ReviewResolution) =>
  request<{ item: InventoryItem | null }>(`/review/${candidateId}/resolve`, json("POST", resolution));

// --- photo upload -----------------------------------------------------

export interface PickedPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export async function uploadPhoto(tripId: string, photo: PickedPhoto): Promise<IngestPhotoResult> {
  const form = new FormData();
  const filename = photo.fileName ?? "photo.jpg";

  if (Platform.OS === "web") {
    // On web, FormData/fetch are the real DOM implementations and need an
    // actual Blob -- the native {uri, name, type} shape below is silently
    // mishandled here (sent as a plain text field, not a file part).
    const blob = await (await fetch(photo.uri)).blob();
    form.append("photo", blob, filename);
  } else {
    // React Native's fetch/FormData polyfill accepts this {uri, name, type}
    // shape directly and streams the file from disk -- it does not want a Blob.
    form.append("photo", {
      uri: photo.uri,
      name: filename,
      type: photo.mimeType ?? "image/jpeg",
    } as unknown as Blob);
  }

  return request<IngestPhotoResult>(`/trips/${tripId}/photos`, {
    method: "POST",
    body: form,
  });
}

// --- wardrobe (global closet, independent of any one trip) -------------

export const getWardrobe = () => request<WardrobeItem[]>("/wardrobe");

export const addWardrobeItem = (input: AddItemInput) =>
  request<WardrobeItem>("/wardrobe", json("POST", input));

export const editWardrobeItem = (
  itemId: string,
  patch: Partial<{ name: string; category: string | null; quantity: number }>,
) => request<WardrobeItem>(`/wardrobe/${itemId}`, json("PATCH", patch));

export const removeWardrobeItem = (itemId: string) =>
  request<void>(`/wardrobe/${itemId}`, { method: "DELETE" });

export async function uploadWardrobePhoto(photo: PickedPhoto): Promise<WardrobePhotoResult> {
  const form = new FormData();
  const filename = photo.fileName ?? "photo.jpg";

  if (Platform.OS === "web") {
    const blob = await (await fetch(photo.uri)).blob();
    form.append("photo", blob, filename);
  } else {
    form.append("photo", {
      uri: photo.uri,
      name: filename,
      type: photo.mimeType ?? "image/jpeg",
    } as unknown as Blob);
  }

  return request<WardrobePhotoResult>("/wardrobe/photos", { method: "POST", body: form });
}

// --- packing lists (reusable, grouped by travel type / destination / activity) ---

export interface PackingListWithItems {
  list: PackingList;
  items: PackingListItem[];
  suggestions?: PackingListSuggestion[];
}

export const listPackingLists = () => request<PackingList[]>("/packing-lists");

export const createPackingList = (category: PackingListCategory, name: string) =>
  request<PackingListWithItems>("/packing-lists", json("POST", { category, name }));

export const getPackingList = (listId: string) =>
  request<PackingListWithItems>(`/packing-lists/${listId}`);

export const renamePackingList = (listId: string, name: string) =>
  request<PackingList>(`/packing-lists/${listId}`, json("PATCH", { name }));

export const deletePackingList = (listId: string) =>
  request<void>(`/packing-lists/${listId}`, { method: "DELETE" });

export const addPackingListItem = (listId: string, input: AddItemInput) =>
  request<PackingListItem>(`/packing-lists/${listId}/items`, json("POST", input));

export const editPackingListItem = (
  listId: string,
  itemId: string,
  patch: Partial<{ name: string; category: string | null; quantity: number }>,
) => request<PackingListItem>(`/packing-lists/${listId}/items/${itemId}`, json("PATCH", patch));

export const removePackingListItem = (listId: string, itemId: string) =>
  request<void>(`/packing-lists/${listId}/items/${itemId}`, { method: "DELETE" });
