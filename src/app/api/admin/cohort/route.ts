import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const stage = searchParams.get("stage") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const leapStatus = searchParams.get("leapStatus") ?? "";

  const businesses = await prisma.business.findMany({
    where: {
      isAdminCreated: true,
      ...(stage ? { stage: stage as never } : {}),
      ...(industry ? { industry: { contains: industry, mode: "insensitive" } } : {}),
      ...(leapStatus ? { leapStatus: { contains: leapStatus, mode: "insensitive" } } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { members: { some: { user: { OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ]}}}}
        ]
      } : {}),
    },
    include: {
      members: {
        where: { role: "OWNER" },
        include: { user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } },
        take: 1,
      },
      _count: { select: { contacts: true, deals: true, planEntries: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(businesses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ownerName, ownerEmail, ownerPhone, businessName, ...bizFields } = await req.json();
  if (!ownerEmail || !businessName) {
    return NextResponse.json({ error: "Email and business name required" }, { status: 400 });
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: ownerName || ownerEmail.split("@")[0], email: ownerEmail, phone: ownerPhone || null, isImported: true },
    });
  }

  const business = await prisma.business.create({
    data: {
      name: businessName,
      isAdminCreated: true,
      ...bizFields,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
    include: {
      members: {
        where: { role: "OWNER" },
        include: { user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } },
        take: 1,
      },
      _count: { select: { contacts: true, deals: true, planEntries: true } },
    },
  });

  return NextResponse.json(business, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, stage, notes, leapStatus } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updated = await prisma.business.update({
    where: { id },
    data: {
      ...(stage !== undefined ? { stage } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(leapStatus !== undefined ? { leapStatus } : {}),
    },
  });

  return NextResponse.json(updated);
}
