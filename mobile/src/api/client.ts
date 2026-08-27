import { Platform } from "react-native";
import type {
  IngestPhotoResult,
  InventoryItem,
  Photo,
  ReviewCandidate,
  ReviewResolution,
  Trip,
  WardrobeItem,
} from "./types";

// Set with a `.env` file (see `.env.example`) — must point at wherever the
// backend is reachable from your phone, not "localhost" (that means the
// phone itself when the app is running on a device).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** Turns a relative API path (e.g. a Photo's `url`) into a fetchable absolute URL. */
export const apiUrl = (relativePath: string) => `${API_BASE_URL}${relativePath}`;

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
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

// --- trips ---------------------------------------------------------------

export interface CreateTripInput {
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  activities: string[];
}

export const listTrips = () => request<Trip[]>("/trips");
export const getTrip = (tripId: string) => request<Trip>(`/trips/${tripId}`);
export const createTrip = (input: CreateTripInput) => request<Trip>("/trips", json("POST", input));
export const getPhotos = (tripId: string) => request<Photo[]>(`/trips/${tripId}/photos`);

// --- inventory -------------------------------------------------------------

export const getInventory = (tripId: string) =>
  request<InventoryItem[]>(`/trips/${tripId}/inventory`);

export interface AddItemInput {
  name: string;
  category: string | null;
  quantity: number;
}

export const addManualItem = (tripId: string, input: AddItemInput) =>
  request<InventoryItem>(`/trips/${tripId}/inventory`, json("POST", input));

export const editItem = (
  tripId: string,
  itemId: string,
  patch: Partial<{ name: string; category: string | null; quantity: number }>,
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
