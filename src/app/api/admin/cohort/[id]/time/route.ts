import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const logs = await prisma.trekTimeLog.findMany({
    where: { businessId: id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(logs);
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const record = await prisma.trekTimeLog.create({
    data: {
      businessId: id,
      date: new Date(body.date),
      quarter: body.quarter?.trim() || "",
      category: body.category?.trim() || "One On One",
      hours: parseFloat(body.hours) || 0,
      staffMember: body.staffMember?.trim() || "Jerry",
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
