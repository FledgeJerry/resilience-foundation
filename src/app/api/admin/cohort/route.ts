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

  const hourRows = await prisma.trekTimeLog.groupBy({
    by: ["businessId"],
    _sum: { hours: true },
    where: { businessId: { not: null } },
  });
  const hoursMap = Object.fromEntries(hourRows.map(r => [r.businessId, r._sum.hours ?? 0]));

  return NextResponse.json(businesses.map(b => ({ ...b, trekHours: hoursMap[b.id] ?? 0 })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ownerName, ownerEmail: rawEmail, ownerPhone, businessName, ...bizFields } = await req.json();
  const ownerEmail: string = (rawEmail ?? "").toLowerCase().trim();

  if (!ownerEmail || !businessName) {
    return NextResponse.json({ error: "Email and business name required" }, { status: 400 });
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: ownerName || ownerEmail.split("@")[0], email: ownerEmail, phone: ownerPhone || null, isImported: true },
    });
  } else {
    // Fill null user fields without overwriting existing data
    const userPatch: Record<string, unknown> = {};
    if (!user.name && ownerName) userPatch.name = ownerName;
    if (!user.phone && ownerPhone) userPatch.phone = ownerPhone;
    if (Object.keys(userPatch).length) {
      user = await prisma.user.update({ where: { id: user.id }, data: userPatch });
    }
  }

  // If user already owns a business, merge incoming data into it instead of creating a duplicate
  const existingMember = await prisma.businessMember.findFirst({
    where: { userId: user.id, role: "OWNER" },
    include: { business: true },
  });

  if (existingMember) {
    const existing = existingMember.business as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    const stringFields = ["industry", "street", "city", "state", "zip", "county", "website", "description", "leapStatus", "notes", "formationType", "naicsCode", "laraId"];
    const numFields = ["currentFte", "plannedFte", "annualRevenue"];
    const boolFields = ["isMinorityOwned", "isWomanOwned", "isVeteranOwned", "isDisabilityOwned"];

    if (bizFields.formationDate && !existing.formationDate) {
      updateData.formationDate = new Date(bizFields.formationDate);
    }

    for (const k of stringFields) {
      const incoming = bizFields[k];
      if (incoming && typeof incoming === "string" && incoming.trim() && !existing[k]) updateData[k] = incoming;
    }
    for (const k of numFields) {
      const incoming = bizFields[k];
      if (incoming != null && existing[k] == null) updateData[k] = incoming;
    }
    for (const k of boolFields) {
      if (bizFields[k] === true && !existing[k]) updateData[k] = true;
    }

    const updated = await prisma.business.update({
      where: { id: existingMember.businessId },
      data: updateData,
      include: {
        members: {
          where: { role: "OWNER" },
          include: { user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } },
          take: 1,
        },
        _count: { select: { contacts: true, deals: true, planEntries: true } },
      },
    });
    return NextResponse.json(updated, { status: 200 });
  }

  const business = await prisma.business.create({
    data: {
      name: businessName,
      isAdminCreated: true,
      ...bizFields,
      ...(bizFields.formationDate ? { formationDate: new Date(bizFields.formationDate) } : {}),
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
