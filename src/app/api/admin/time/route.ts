import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// "Q2 2025" → date range for filtering
function quarterToDateRange(q: string): { gte: Date; lt: Date } | null {
  const m = q.trim().match(/Q(\d)\s+(\d{4})/i);
  if (!m) return null;
  const qn = parseInt(m[1]);
  const yr = parseInt(m[2]);
  const startMonth = (qn - 1) * 3;
  return { gte: new Date(yr, startMonth, 1), lt: new Date(yr, startMonth + 3, 1) };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter") ?? "";
  const category = searchParams.get("category") ?? "";
  const dateRange = quarter ? quarterToDateRange(quarter) : null;

  const logs = await prisma.trekTimeLog.findMany({
    where: {
      ...(dateRange ? { date: dateRange } : {}),
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
      category: body.category?.trim() || "",
      hours: parseFloat(body.hours) || 0,
      staffMember: body.staffMember?.trim() || "Jerry",
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
