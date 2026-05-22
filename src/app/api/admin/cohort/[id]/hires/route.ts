import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const hires = await prisma.businessHire.findMany({
    where: { businessId: id },
    orderBy: { hiredAt: "desc" },
  });
  return NextResponse.json(hires);
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const fteAdded = parseInt(body.fteAdded ?? "1", 10);
  const record = await prisma.businessHire.create({
    data: {
      businessId: id,
      fteAdded,
      hiredAt: body.hiredAt ? new Date(body.hiredAt) : null,
      notes: body.notes?.trim() || null,
    },
  });
  // Bump currentFte on the business
  await prisma.business.update({
    where: { id },
    data: { currentFte: { increment: fteAdded } },
  });
  return NextResponse.json(record);
}
