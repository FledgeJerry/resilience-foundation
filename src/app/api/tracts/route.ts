import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findTractForPoint } from "@/lib/pointInPolygon";
import tractsGeoJson from "@/data/inghamTractsHolc.json";

type TractFeature = {
  type: "Feature";
  properties: { geoid: string; name: string; holc_grade: string };
  geometry: { type: "Polygon"; coordinates: number[][][] };
};

const TRACT_FEATURES = (tractsGeoJson as unknown as { features: TractFeature[] }).features;

// Public read-only endpoint — counts of geocoded cooperative-network locations
// per census tract, for lansing.love's geographic-reach choropleth. Returns
// aggregate counts only (no names, no individual addresses) — point-level
// data never leaves this endpoint.
export async function GET() {
  const [users, businesses, houses, coops] = await Promise.all([
    prisma.user.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { lat: true, lng: true } }),
    prisma.business.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { lat: true, lng: true } }),
    prisma.housingProject.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { lat: true, lng: true } }),
    prisma.coop.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { lat: true, lng: true } }),
  ]);

  const counts: Record<string, { entrepreneur: number; business: number; house: number; coop: number; total: number; unmatched?: boolean }> = {};
  let unmatched = 0;

  function tally(points: { lat: number | null; lng: number | null }[], type: "entrepreneur" | "business" | "house" | "coop") {
    for (const p of points) {
      if (p.lat == null || p.lng == null) continue;
      const tract = findTractForPoint(p.lng, p.lat, TRACT_FEATURES);
      if (!tract) { unmatched++; continue; }
      const geoid = tract.properties.geoid;
      counts[geoid] ??= { entrepreneur: 0, business: 0, house: 0, coop: 0, total: 0 };
      counts[geoid][type]++;
      counts[geoid].total++;
    }
  }

  tally(users, "entrepreneur");
  tally(businesses, "business");
  tally(houses, "house");
  tally(coops, "coop");

  return NextResponse.json({
    tracts: Object.entries(counts).map(([geoid, c]) => ({ geoid, ...c })),
    unmatched, // points geocoded outside the 53 Ingham County tracts we have HOLC data for
  });
}
