import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.housingProject.findMany({
      where: { members: { some: { userId: session.user.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        shareholders: { select: { id: true, shareCount: true, amountPaid: true } },
        _count: { select: { treasuryEntries: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/housing/projects:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const project = await prisma.housingProject.create({
      data: {
        name: name.trim(),
        members: { create: { userId: session.user.id, role: "OWNER" } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("POST /api/housing/projects:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
