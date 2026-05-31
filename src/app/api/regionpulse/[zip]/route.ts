import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type RegionPulseData = {
  zip: string;
  name: string;
  population: number;
  medianIncome: number;
  laborForce: number;
  employed: number;
  unemployed: number;
  unemploymentRate: number;
  medianHomeValue: number;
  pctBachelorsPlus: number;
  pctWhite: number;
  pctMinority: number;
  fetchedAt: string;
};

async function fetchFromCensus(zip: string): Promise<RegionPulseData> {
  const geoId = `86000US${zip}`;
  const tables = "B01003,B19013,B23025,B25077,B15003,B02001";
  const url = `https://api.censusreporter.org/1.0/data/show/latest?table_ids=${tables}&geo_ids=${geoId}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Census Reporter error: ${res.status}`);
  const json = await res.json();
  const d = json.data?.[geoId];
  if (!d) throw new Error(`No data for ZIP ${zip}`);

  const meta = json.geography?.[geoId];
  const name = meta?.name ?? zip;

  const pop = d.B01003?.estimate?.B01003001 ?? 0;
  const medianIncome = d.B19013?.estimate?.B19013001 ?? 0;
  const laborForce = d.B23025?.estimate?.B23025002 ?? 0;
  const employed = d.B23025?.estimate?.B23025004 ?? 0;
  const unemployed = d.B23025?.estimate?.B23025005 ?? 0;
  const unemploymentRate = laborForce > 0 ? (unemployed / laborForce) * 100 : 0;
  const medianHomeValue = d.B25077?.estimate?.B25077001 ?? 0;

  // Education: bachelor's (022) + master's (023) + professional (024) + doctorate (025)
  const totalEd = d.B15003?.estimate?.B15003001 ?? 1;
  const bach = (d.B15003?.estimate?.B15003022 ?? 0) + (d.B15003?.estimate?.B15003023 ?? 0) +
               (d.B15003?.estimate?.B15003024 ?? 0) + (d.B15003?.estimate?.B15003025 ?? 0);
  const pctBachelorsPlus = totalEd > 0 ? (bach / totalEd) * 100 : 0;

  const totalRace = d.B02001?.estimate?.B02001001 ?? 1;
  const white = d.B02001?.estimate?.B02001002 ?? 0;
  const pctWhite = totalRace > 0 ? (white / totalRace) * 100 : 0;
  const pctMinority = 100 - pctWhite;

  return {
    zip,
    name,
    population: Math.round(pop),
    medianIncome: Math.round(medianIncome),
    laborForce: Math.round(laborForce),
    employed: Math.round(employed),
    unemployed: Math.round(unemployed),
    unemploymentRate: Math.round(unemploymentRate * 10) / 10,
    medianHomeValue: Math.round(medianHomeValue),
    pctBachelorsPlus: Math.round(pctBachelorsPlus * 10) / 10,
    pctWhite: Math.round(pctWhite * 10) / 10,
    pctMinority: Math.round(pctMinority * 10) / 10,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ zip: string }> }) {
  const { zip } = await params;
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: "Invalid ZIP" }, { status: 400 });

  // Check cache
  const cached = await prisma.regionPulseCache.findUnique({ where: { zip } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchFromCensus(zip);
    await prisma.regionPulseCache.upsert({
      where: { zip },
      update: { data: data as object, fetchedAt: new Date() },
      create: { zip, data: data as object, fetchedAt: new Date() },
    });
    return NextResponse.json(data);
  } catch (err) {
    // Return stale cache if fetch fails
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
