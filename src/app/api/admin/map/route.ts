import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeStructured, geocodeOneLine } from "@/lib/geocode";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// GET — return only already-geocoded pins (fast, no timeout risk)
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const untriedCount =
    await prisma.user.count({ where: { city: { not: null }, lat: null, geocodeTriedAt: null } }) +
    await prisma.business.count({ where: { city: { not: null }, lat: null, geocodeTriedAt: null } }) +
    await prisma.housingProject.count({ where: { address: { not: null }, lat: null, geocodeTriedAt: null } }) +
    await prisma.coop.count({ where: { city: { not: null }, lat: null, geocodeTriedAt: null } });

  return NextResponse.json({ pins, ungeocodedCount, untriedCount });
}

// POST — geocode every untried record (Census Bureau API has no meaningful rate limit,
// unlike Nominatim which this used to hit). Records that fail get geocodeTriedAt stamped
// so they're skipped on future runs instead of permanently blocking the queue.
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let geocoded = 0;
  let attempted = 0;

  const users = await prisma.user.findMany({ where: { city: { not: null }, lat: null, geocodeTriedAt: null }, select: { id: true, street: true, city: true, state: true, zip: true } });
  for (const u of users) {
    attempted++;
    const coords = await geocodeStructured(u.street, u.city, u.state, u.zip);
    await prisma.user.update({ where: { id: u.id }, data: { ...coords, geocodeTriedAt: new Date() } });
    if (coords) geocoded++;
    await sleep(50);
  }

  const businesses = await prisma.business.findMany({ where: { city: { not: null }, lat: null, geocodeTriedAt: null }, select: { id: true, street: true, city: true, state: true, zip: true } });
  for (const b of businesses) {
    attempted++;
    const coords = await geocodeStructured(b.street, b.city, b.state, b.zip);
    await prisma.business.update({ where: { id: b.id }, data: { ...coords, geocodeTriedAt: new Date() } });
    if (coords) geocoded++;
    await sleep(50);
  }

  const houses = await prisma.housingProject.findMany({ where: { address: { not: null }, lat: null, geocodeTriedAt: null }, select: { id: true, address: true } });
  for (const h of houses) {
    attempted++;
    const coords = await geocodeOneLine(h.address!);
    await prisma.housingProject.update({ where: { id: h.id }, data: { ...coords, geocodeTriedAt: new Date() } });
    if (coords) geocoded++;
    await sleep(50);
  }

  const coops = await prisma.coop.findMany({ where: { city: { not: null }, lat: null, geocodeTriedAt: null }, select: { id: true, street: true, city: true, state: true, zip: true } });
  for (const c of coops) {
    attempted++;
    const coords = await geocodeStructured(c.street, c.city, c.state, c.zip);
    await prisma.coop.update({ where: { id: c.id }, data: { ...coords, geocodeTriedAt: new Date() } });
    if (coords) geocoded++;
    await sleep(50);
  }

  const remaining =
    await prisma.user.count({ where: { city: { not: null }, lat: null } }) +
    await prisma.business.count({ where: { city: { not: null }, lat: null } }) +
    await prisma.housingProject.count({ where: { address: { not: null }, lat: null } }) +
    await prisma.coop.count({ where: { city: { not: null }, lat: null } });

  return NextResponse.json({ geocoded, attempted, remaining });
}
