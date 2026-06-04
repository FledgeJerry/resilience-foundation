import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "resilience.foundation/1.0" } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// GET — return only already-geocoded pins (fast, no timeout risk)
export async function GET() {
  const pins: { id: string; type: string; label: string; sublabel?: string; lat: number; lng: number }[] = [];

  const [users, businesses, houses, coops] = await Promise.all([
    prisma.user.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { id: true, name: true, city: true, lat: true, lng: true } }),
    prisma.business.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { id: true, name: true, city: true, lat: true, lng: true } }),
    prisma.housingProject.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { id: true, name: true, address: true, lat: true, lng: true } }),
    prisma.coop.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { id: true, name: true, city: true, lat: true, lng: true } }),
  ]);

  for (const u of users) pins.push({ id: u.id, type: "entrepreneur", label: u.name ?? "Entrepreneur", sublabel: u.city ?? undefined, lat: u.lat!, lng: u.lng! });
  for (const b of businesses) pins.push({ id: b.id, type: "business", label: b.name, sublabel: b.city ?? undefined, lat: b.lat!, lng: b.lng! });
  for (const h of houses) pins.push({ id: h.id, type: "house", label: h.name, sublabel: h.address ?? undefined, lat: h.lat!, lng: h.lng! });
  for (const c of coops) pins.push({ id: c.id, type: "coop", label: c.name, sublabel: c.city ?? undefined, lat: c.lat!, lng: c.lng! });

  const ungeocodedCount =
    await prisma.user.count({ where: { city: { not: null }, lat: null } }) +
    await prisma.business.count({ where: { city: { not: null }, lat: null } }) +
    await prisma.housingProject.count({ where: { address: { not: null }, lat: null } }) +
    await prisma.coop.count({ where: { city: { not: null }, lat: null } });

  return NextResponse.json({ pins, ungeocodedCount });
}

// POST — geocode one batch of ungeocoded records (call repeatedly until done)
export async function POST() {
  const BATCH = 5;
  let geocoded = 0;

  const users = await prisma.user.findMany({ where: { city: { not: null }, lat: null }, take: BATCH, select: { id: true, street: true, city: true, state: true, zip: true } });
  for (const u of users) {
    const q = [u.street, u.city, u.state, u.zip].filter(Boolean).join(", ");
    const coords = await geocode(q);
    if (coords) { await prisma.user.update({ where: { id: u.id }, data: coords }); geocoded++; }
    await sleep(1100);
  }

  if (geocoded < BATCH) {
    const businesses = await prisma.business.findMany({ where: { city: { not: null }, lat: null }, take: BATCH - geocoded, select: { id: true, street: true, city: true, state: true, zip: true } });
    for (const b of businesses) {
      const q = [b.street, b.city, b.state, b.zip].filter(Boolean).join(", ");
      const coords = await geocode(q);
      if (coords) { await prisma.business.update({ where: { id: b.id }, data: coords }); geocoded++; }
      await sleep(1100);
    }
  }

  if (geocoded < BATCH) {
    const houses = await prisma.housingProject.findMany({ where: { address: { not: null }, lat: null }, take: BATCH - geocoded, select: { id: true, address: true } });
    for (const h of houses) {
      const coords = await geocode(h.address!);
      if (coords) { await prisma.housingProject.update({ where: { id: h.id }, data: coords }); geocoded++; }
      await sleep(1100);
    }
  }

  if (geocoded < BATCH) {
    const coops = await prisma.coop.findMany({ where: { city: { not: null }, lat: null }, take: BATCH - geocoded, select: { id: true, street: true, city: true, state: true, zip: true } });
    for (const c of coops) {
      const q = [c.street, c.city, c.state, c.zip].filter(Boolean).join(", ");
      const coords = await geocode(q);
      if (coords) { await prisma.coop.update({ where: { id: c.id }, data: coords }); geocoded++; }
      await sleep(1100);
    }
  }

  const remaining =
    await prisma.user.count({ where: { city: { not: null }, lat: null } }) +
    await prisma.business.count({ where: { city: { not: null }, lat: null } }) +
    await prisma.housingProject.count({ where: { address: { not: null }, lat: null } }) +
    await prisma.coop.count({ where: { city: { not: null }, lat: null } });

  return NextResponse.json({ geocoded, remaining });
}
