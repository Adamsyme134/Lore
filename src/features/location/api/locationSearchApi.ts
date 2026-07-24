export type LocationSearchResult = {
  id: string;
  name: string;
  displayName: string;
  latitude: number | null;
  longitude: number | null;
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
};

const locationSearchCache = new Map<string, LocationSearchResult[]>();

function formatShortLocationName(displayName: string) {
  const nameParts = displayName.split(', ');
  return nameParts.length > 2
    ? `${nameParts[0]}, ${nameParts[nameParts.length - 1]}`
    : displayName;
}

export async function searchLocations(query: string, limit = 5): Promise<LocationSearchResult[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 3) {
    return [];
  }

  const cacheKey = `${normalizedQuery.toLowerCase()}::${limit}`;
  const cached = locationSearchCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedQuery)}&limit=${limit}`,
    {
      headers: { 'User-Agent': 'LoreApp/1.0' }
    }
  );

  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }

  const data = (await response.json()) as NominatimResult[];
  const results = data
    .filter((item) => item.display_name)
    .map((item, index) => {
      const displayName = item.display_name ?? '';

      return {
        id: item.place_id?.toString() ?? `${item.osm_type ?? 'place'}-${item.osm_id ?? index}`,
        name: formatShortLocationName(displayName),
        displayName,
        latitude: item.lat ? Number(item.lat) : null,
        longitude: item.lon ? Number(item.lon) : null
      };
    });

  locationSearchCache.set(cacheKey, results);
  return results;
}
