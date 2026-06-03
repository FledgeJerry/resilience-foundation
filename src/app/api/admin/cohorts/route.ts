import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cohorts = await prisma.cohort.findMany({
    orderBy: [{ year: "desc" }, { name: "asc" }],
    include: { _count: { select: { businesses: true } } },
  });
  return NextResponse.json(cohorts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, program, year, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const cohort = await prisma.cohort.create({
    data: { name: name.trim(), program, year: year ? parseInt(year) : null, description },
    include: { _count: { select: { businesses: true } } },
  });
  return NextResponse.json(cohort);
}
