// Standard ray-casting point-in-polygon test. Good enough for binning a few
// hundred points into ~50 census tracts at request time — no need for a GIS
// library or a stored tract column for data this size.
type Ring = number[][];
type Polygon = { type: "Polygon"; coordinates: Ring[] };

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  // First ring is the outer boundary; treat any additional rings as holes.
  const [outer, ...holes] = polygon.coordinates;
  if (!pointInRing(lng, lat, outer)) return false;
  return !holes.some((hole) => pointInRing(lng, lat, hole));
}

export function findTractForPoint<T extends { geometry: Polygon }>(
  lng: number,
  lat: number,
  features: T[]
): T | null {
  return features.find((f) => pointInPolygon(lng, lat, f.geometry)) ?? null;
}
