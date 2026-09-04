// Wikipedia's public MediaWiki API -- free, no API key, no signup. Used only
// to find a representative editorial photo for a destination name (e.g.
// "Amalfi Coast", "Kyoto, Japan"); this is generic place photography, never
// anything claimed to be the user's own.

export async function searchDestinationImage(query: string): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const body = (await res.json()) as {
    query?: { pages?: Record<string, { thumbnail?: { source: string } }> };
  };
  const pages = body.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0];
  return first?.thumbnail?.source ?? null;
}
