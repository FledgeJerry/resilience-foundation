import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      members: {
        where: { role: "OWNER" },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        take: 1,
      },
      contacts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(business);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Separate user fields from business fields
  const { ownerName, ownerPhone, laraDate, leapSubmittedAt, ...bizFields } = body;

  const business = await prisma.business.update({
    where: { id },
    data: {
      ...bizFields,
      ...(laraDate !== undefined ? { laraDate: laraDate ? new Date(laraDate) : null } : {}),
      ...(leapSubmittedAt !== undefined ? { leapSubmittedAt: leapSubmittedAt ? new Date(leapSubmittedAt) : null } : {}),
    },
    include: {
      members: {
        where: { role: "OWNER" },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        take: 1,
      },
    },
  });

  // Update owner user record if provided
  const ownerId = business.members[0]?.user.id;
  if (ownerId && (ownerName !== undefined || ownerPhone !== undefined)) {
    await prisma.user.update({
      where: { id: ownerId },
      data: {
        ...(ownerName !== undefined ? { name: ownerName } : {}),
        ...(ownerPhone !== undefined ? { phone: ownerPhone } : {}),
      },
    });
  }

  // Re-geocode if address fields changed and we have enough to geocode
  const addressChanged = ["street", "city", "state", "zip"].some(f => f in bizFields);
  if (addressChanged) {
    const q = [business.street, business.city, business.state, business.zip].filter(Boolean).join(", ");
    if (q) {
      try {
        const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
          headers: { "User-Agent": "resilience.foundation/1.0" },
        });
        const geoData = await geo.json();
        if (geoData[0]) {
          await prisma.business.update({
            where: { id },
            data: { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) },
          });
        }
      } catch {}
    }
  }

  return NextResponse.json(business);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
