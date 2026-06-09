#!/usr/bin/env npx tsx
/**
 * Geocode all records missing lat/lng using the US Census Bureau API.
 * Run: npx tsx scripts/geocode-all.ts
 * Add --clear to wipe existing lat/lng and re-geocode everything.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { geocodeStructured, geocodeOneLine } from "../src/lib/geocode";

const DELAY_MS = 200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const clear = process.argv.includes("--clear");

async function geocodeTable(
  label: string,
  fetch: () => Promise<{ id: string; street?: string | null; city?: string | null; state?: string | null; zip?: string | null; address?: string | null }[]>,
  update: (id: string, lat: number, lng: number) => Promise<void>,
) {
  const records = await fetch();
  if (!records.length) { console.log(`${label}: none to geocode`); return; }
  console.log(`${label}: geocoding ${records.length} records…`);
  let ok = 0, fail = 0;
  for (const r of records) {
    const coords = r.address != null
      ? await geocodeOneLine(r.address)
      : await geocodeStructured(r.street, r.city, r.state, r.zip);
    if (coords) {
      await update(r.id, coords.lat, coords.lng);
      console.log(`  ✓ ${r.id} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      ok++;
    } else {
      const addr = r.address ?? [r.street, r.city, r.state, r.zip].filter(Boolean).join(", ");
      console.log(`  ✗ ${r.id} — no match for: ${addr}`);
      fail++;
    }
    await sleep(DELAY_MS);
  }
  console.log(`${label}: ${ok} geocoded, ${fail} failed\n`);
}

async function main() {
  if (clear) {
    console.log("Clearing existing lat/lng…");
    await prisma.user.updateMany({ where: { lat: { not: null } }, data: { lat: null, lng: null } });
    await prisma.business.updateMany({ where: { lat: { not: null } }, data: { lat: null, lng: null } });
    await prisma.housingProject.updateMany({ where: { lat: { not: null } }, data: { lat: null, lng: null } });
    await prisma.coop.updateMany({ where: { lat: { not: null } }, data: { lat: null, lng: null } });
  }

  await geocodeTable(
    "Users",
    () => prisma.user.findMany({ where: { city: { not: null }, lat: null }, select: { id: true, street: true, city: true, state: true, zip: true } }),
    (id, lat, lng) => prisma.user.update({ where: { id }, data: { lat, lng } }).then(() => {}),
  );

  await geocodeTable(
    "Businesses",
    () => prisma.business.findMany({ where: { city: { not: null }, lat: null }, select: { id: true, name: true, street: true, city: true, state: true, zip: true } }),
    (id, lat, lng) => prisma.business.update({ where: { id }, data: { lat, lng } }).then(() => {}),
  );

  await geocodeTable(
    "Housing Projects",
    () => prisma.housingProject.findMany({ where: { address: { not: null }, lat: null }, select: { id: true, name: true, address: true } }),
    (id, lat, lng) => prisma.housingProject.update({ where: { id }, data: { lat, lng } }).then(() => {}),
  );

  await geocodeTable(
    "Co-ops",
    () => prisma.coop.findMany({ where: { city: { not: null }, lat: null }, select: { id: true, name: true, street: true, city: true, state: true, zip: true } }),
    (id, lat, lng) => prisma.coop.update({ where: { id }, data: { lat, lng } }).then(() => {}),
  );

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
