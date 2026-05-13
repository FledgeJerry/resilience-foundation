import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.businessMember.findMany({
    where: { userId: session.user.id },
    include: {
      business: {
        include: {
          _count: { select: { contacts: true, deals: true, transactions: true } },
        },
      },
    },
    orderBy: { business: { updatedAt: "desc" } },
  });

  return NextResponse.json(memberships.map((m) => ({ ...m.business, role: m.role })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, type, industry, city, state } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const business = await prisma.business.create({
    data: {
      name: name.trim(),
      description,
      type: type ?? "UNDECIDED",
      industry,
      city,
      state,
      members: { create: { userId: session.user.id, role: "OWNER" } },
    },
  });

  return NextResponse.json(business, { status: 201 });
}
