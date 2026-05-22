import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const funding = await prisma.businessFunding.findMany({
    where: { businessId: id },
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json(funding);
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const record = await prisma.businessFunding.create({
    data: {
      businessId: id,
      type: body.type ?? "GRANT",
      amount: body.amount ? parseFloat(body.amount) : null,
      source: body.source?.trim() ?? "",
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record);
}
