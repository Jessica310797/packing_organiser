import { API_BASE_URL } from "./config";
import { IdentifiedItem } from "./types";

export class ApiError extends Error {}

export async function identifyItem(params: { text?: string; photoUri?: string }): Promise<IdentifiedItem> {
  const { text, photoUri } = params;

  const form = new FormData();
  if (text) form.append("text", text);
  if (photoUri) {
    const filename = photoUri.split("/").pop() ?? "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : "jpg";
    const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    // React Native's fetch/FormData accepts this file-like shape.
    form.append("image", { uri: photoUri, name: filename, type: mimeType } as unknown as Blob);
  }

  const response = await fetch(`${API_BASE_URL}/api/identify`, {
    method: "POST",
    body: form,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new ApiError(body?.error ? JSON.stringify(body.error) : "Failed to identify item");
  }

  return body.item as IdentifiedItem;
}
