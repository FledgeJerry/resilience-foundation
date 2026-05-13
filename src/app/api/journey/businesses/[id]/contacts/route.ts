import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAccess(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { type, name, email, phone, company, notes, tags } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const contact = await prisma.contact.create({
    data: {
      businessId,
      type: type ?? "LEAD",
      name: name.trim(),
      email,
      phone,
      company,
      notes,
      tags: tags ?? [],
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
