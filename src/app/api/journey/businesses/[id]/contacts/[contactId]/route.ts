import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAccess(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId, contactId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ["type", "name", "email", "phone", "company", "notes", "tags"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const contact = await prisma.contact.update({
    where: { id: contactId },
    data,
  });
  return NextResponse.json(contact);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: businessId, contactId } = await params;
  if (!await checkAccess(session.user.id, businessId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.contact.delete({ where: { id: contactId } });
  return NextResponse.json({ ok: true });
}
