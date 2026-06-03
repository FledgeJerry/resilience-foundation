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

export async function GET() {
  const pins: { id: string; type: string; label: string; sublabel?: string; lat: number; lng: number }[] = [];

  // Users with city
  const users = await prisma.user.findMany({
    where: { city: { not: null } },
    select: { id: true, name: true, city: true, state: true, street: true, zip: true, lat: true, lng: true },
  });

  for (const u of users) {
    let lat = u.lat;
    let lng = u.lng;
    if (!lat || !lng) {
      const q = [u.street, u.city, u.state, u.zip].filter(Boolean).join(", ");
      const coords = await geocode(q);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        await prisma.user.update({ where: { id: u.id }, data: { lat, lng } });
      }
      await sleep(1100);
    }
    if (lat && lng) pins.push({ id: u.id, type: "entrepreneur", label: u.name ?? "Entrepreneur", sublabel: u.city ?? undefined, lat, lng });
  }

  // Businesses with city
  const businesses = await prisma.business.findMany({
    where: { city: { not: null } },
    select: { id: true, name: true, city: true, state: true, street: true, zip: true, lat: true, lng: true },
  });

  for (const b of businesses) {
    let lat = b.lat;
    let lng = b.lng;
    if (!lat || !lng) {
      const q = [b.street, b.city, b.state, b.zip].filter(Boolean).join(", ");
      const coords = await geocode(q);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        await prisma.business.update({ where: { id: b.id }, data: { lat, lng } });
      }
      await sleep(1100);
    }
    if (lat && lng) pins.push({ id: b.id, type: "business", label: b.name, sublabel: b.city ?? undefined, lat, lng });
  }

  // Housing projects with address
  const houses = await prisma.housingProject.findMany({
    where: { address: { not: null } },
    select: { id: true, name: true, address: true, city: true, state: true, zip: true, lat: true, lng: true },
  });

  for (const h of houses) {
    let lat = h.lat;
    let lng = h.lng;
    if (!lat || !lng) {
      const q = [h.address, h.city, h.state, h.zip].filter(Boolean).join(", ");
      const coords = await geocode(q);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        await prisma.housingProject.update({ where: { id: h.id }, data: { lat, lng } });
      }
      await sleep(1100);
    }
    if (lat && lng) pins.push({ id: h.id, type: "house", label: h.name, sublabel: h.address ?? undefined, lat, lng });
  }

  // Coops with city
  const coops = await prisma.coop.findMany({
    where: { city: { not: null } },
    select: { id: true, name: true, city: true, state: true, street: true, zip: true, lat: true, lng: true },
  });

  for (const c of coops) {
    let lat = c.lat;
    let lng = c.lng;
    if (!lat || !lng) {
      const q = [c.street, c.city, c.state, c.zip].filter(Boolean).join(", ");
      const coords = await geocode(q);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        await prisma.coop.update({ where: { id: c.id }, data: { lat, lng } });
      }
      await sleep(1100);
    }
    if (lat && lng) pins.push({ id: c.id, type: "coop", label: c.name, sublabel: c.city ?? undefined, lat, lng });
  }

  return NextResponse.json({ pins });
}
