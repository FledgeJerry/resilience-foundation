import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Allow imported (no-password) users to claim their account by registering
    if (existing.isImported && !existing.passwordHash) {
      const passwordHash = await bcrypt.hash(password, 12);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { name: name || existing.name, passwordHash, isImported: false },
      });
      return NextResponse.json({ id: updated.id, email: updated.email }, { status: 200 });
    }
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
