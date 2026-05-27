import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter") ?? "";
  const category = searchParams.get("category") ?? "";

  const logs = await prisma.trekTimeLog.findMany({
    where: {
      ...(quarter ? { quarter: { contains: quarter, mode: "insensitive" } } : {}),
      ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
    },
    include: { business: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const record = await prisma.trekTimeLog.create({
    data: {
      businessId: null,
      date: new Date(body.date),
      quarter: body.quarter?.trim() || "",
      category: body.category?.trim() || "",
      hours: parseFloat(body.hours) || 0,
      staffMember: body.staffMember?.trim() || "Jerry",
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
