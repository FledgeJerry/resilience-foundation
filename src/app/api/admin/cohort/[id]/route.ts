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
  const { ownerName, ownerPhone, ...bizFields } = body;

  const business = await prisma.business.update({
    where: { id },
    data: bizFields,
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
