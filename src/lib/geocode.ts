const CENSUS_BASE = "https://geocoding.geo.census.gov/geocoder/locations";
const BENCHMARK = "Public_AR_Current";

type Coords = { lat: number; lng: number };

// Structured geocode — best results when you have separate address parts
export async function geocodeStructured(
  street: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined,
): Promise<Coords | null> {
  if (!street && !city) return null;
  const params = new URLSearchParams({ benchmark: BENCHMARK, format: "json" });
  if (street) params.set("street", street);
  if (city) params.set("city", city);
  if (state) params.set("state", state ?? "");
  if (zip) params.set("zip", zip);
  try {
    const res = await fetch(`${CENSUS_BASE}/address?${params}`, {
      headers: { "User-Agent": "resilience.foundation/1.0" },
    });
    const data = await res.json();
    const match = data.result?.addressMatches?.[0];
    if (match) return { lat: match.coordinates.y, lng: match.coordinates.x };
  } catch {}
  return null;
}

// One-line geocode — for a single address string (e.g. HousingProject.address)
export async function geocodeOneLine(address: string): Promise<Coords | null> {
  if (!address?.trim()) return null;
  const params = new URLSearchParams({ address, benchmark: BENCHMARK, format: "json" });
  try {
    const res = await fetch(`${CENSUS_BASE}/onelineaddress?${params}`, {
      headers: { "User-Agent": "resilience.foundation/1.0" },
    });
    const data = await res.json();
    const match = data.result?.addressMatches?.[0];
    if (match) return { lat: match.coordinates.y, lng: match.coordinates.x };
  } catch {}
  return null;
}
