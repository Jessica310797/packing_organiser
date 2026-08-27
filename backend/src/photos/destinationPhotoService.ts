import * as wikipedia from "./wikipediaClient.js";

export interface DestinationPhoto {
  available: boolean;
  url?: string;
}

export interface DestinationPhotoClient {
  searchDestinationImage: typeof wikipedia.searchDestinationImage;
}

const defaultClient: DestinationPhotoClient = {
  searchDestinationImage: wikipedia.searchDestinationImage,
};

/**
 * Best-effort editorial photo for a trip's destination. Returns
 * { available: false } -- never throws -- if nothing is found or the lookup
 * fails for any reason, so a missing photo never breaks the trip card.
 */
export async function getDestinationPhoto(
  destination: string,
  client: DestinationPhotoClient = defaultClient,
): Promise<DestinationPhoto> {
  try {
    const url = await client.searchDestinationImage(destination);
    if (!url) return { available: false };
    return { available: true, url };
  } catch {
    return { available: false };
  }
}
