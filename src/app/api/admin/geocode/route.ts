import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeStructured } from "@/lib/geocode";

// GET    — businesses still missing lat/lng, with enough context to fix the address
// PATCH  — update address fields and/or retry the geocode for one business

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const businesses = await prisma.business.findMany({
    where: { lat: null },
    select: {
      id: true, name: true, street: true, city: true, state: true, zip: true,
      website: true, laraId: true, geocodeTriedAt: true,
      members: { select: { user: { select: { name: true, email: true } } }, take: 2 },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ businesses });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, street, city, state, zip } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const business = await prisma.business.update({
    where: { id },
    data: {
      ...(street !== undefined ? { street: street || null } : {}),
      ...(city !== undefined ? { city: city || null } : {}),
      ...(state !== undefined ? { state: state || null } : {}),
      ...(zip !== undefined ? { zip: zip || null } : {}),
    },
  });

  const coords = await geocodeStructured(business.street, business.city, business.state, business.zip);
  await prisma.business.update({
    where: { id },
    data: { ...coords, geocodeTriedAt: coords ? new Date() : null },
  });

  return NextResponse.json({ ok: true, geocoded: !!coords });
}
