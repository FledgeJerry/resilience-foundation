import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const asUserId = searchParams.get("userId");
    if (asUserId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetUserId = asUserId ?? session.user.id;

    const memberships = await prisma.coopMember.findMany({
      where: { userId: targetUserId },
      include: { coop: { select: { id: true, name: true, createdAt: true, isPublic: true, website: true, contactEmail: true, phone: true } } },
      orderBy: { coop: { createdAt: "asc" } },
    });

    return NextResponse.json(memberships.map((m) => ({ ...m.coop, role: m.role })));
  } catch (err) {
    console.error("GET /api/coops error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const coop = await prisma.coop.create({
    data: {
      name: name.trim(),
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json({ ...coop, role: "OWNER" });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { coopId, isPublic, website, contactEmail, phone, street, city, state, zip } = await req.json();
  if (!coopId) return NextResponse.json({ error: "coopId required" }, { status: 400 });

  const membership = await prisma.coopMember.findUnique({
    where: { coopId_userId: { coopId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const addressChanged = street !== undefined || city !== undefined || state !== undefined || zip !== undefined;

  const coop = await prisma.coop.update({
    where: { id: coopId },
    data: {
      ...(isPublic !== undefined && { isPublic }),
      ...(website !== undefined && { website: website?.trim() || null }),
      ...(contactEmail !== undefined && { contactEmail: contactEmail?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(street !== undefined && { street: street?.trim() || null }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(state !== undefined && { state: state?.trim() || null }),
      ...(zip !== undefined && { zip: zip?.trim() || null }),
    },
  });

  if (addressChanged) {
    const q = [coop.street, coop.city, coop.state, coop.zip].filter(Boolean).join(", ");
    if (q) {
      try {
        const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
          headers: { "User-Agent": "resilience.foundation/1.0" },
        });
        const geoData = await geo.json();
        if (geoData[0]) {
          await prisma.coop.update({
            where: { id: coopId },
            data: { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) },
          });
        }
      } catch {}
    }
  }

  return NextResponse.json(coop);
}
