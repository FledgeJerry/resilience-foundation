/**
 * Delete all isAdminCreated businesses and their isImported-only users.
 * Safe to run on local or production — never touches admin users or users
 * who have set a password.
 *
 * Run: npx tsx scripts/cleanup-cohort.ts
 */

import path from "path";
import { config } from "dotenv";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: path.join(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all admin-created businesses
  const businesses = await prisma.business.findMany({
    where: { isAdminCreated: true },
    include: {
      members: { include: { user: { select: { id: true, isImported: true, passwordHash: true } } } },
    },
  });

  console.log(`Found ${businesses.length} admin-created businesses to delete.`);
  if (businesses.length === 0) { await prisma.$disconnect(); return; }

  // Collect user IDs that are safe to delete:
  // isImported=true, no password, only linked to admin-created businesses
  const candidateUserIds = new Set<string>();
  for (const biz of businesses) {
    for (const m of biz.members) {
      if (m.user.isImported && !m.user.passwordHash) {
        candidateUserIds.add(m.user.id);
      }
    }
  }

  const bizIds = businesses.map((b) => b.id);

  // Confirm before deleting
  console.log(`\nWill delete:`);
  console.log(`  ${bizIds.length} businesses`);
  console.log(`  Up to ${candidateUserIds.size} imported users (will verify no other memberships)`);
  console.log(`\nProceeding in 3 seconds… (Ctrl+C to abort)`);
  await new Promise((r) => setTimeout(r, 3000));

  // Delete contacts linked to these businesses
  const { count: contactsDeleted } = await prisma.contact.deleteMany({
    where: { businessId: { in: bizIds } },
  });

  // Delete business members
  const { count: membersDeleted } = await prisma.businessMember.deleteMany({
    where: { businessId: { in: bizIds } },
  });

  // Delete businesses
  const { count: bizsDeleted } = await prisma.business.deleteMany({
    where: { id: { in: bizIds } },
  });

  // Delete candidate users who now have no remaining memberships
  let usersDeleted = 0;
  for (const userId of candidateUserIds) {
    const remaining = await prisma.businessMember.count({ where: { userId } });
    if (remaining === 0) {
      await prisma.user.delete({ where: { id: userId } });
      usersDeleted++;
    }
  }

  console.log(`\nDone:`);
  console.log(`  ${contactsDeleted} contacts deleted`);
  console.log(`  ${membersDeleted} business members deleted`);
  console.log(`  ${bizsDeleted} businesses deleted`);
  console.log(`  ${usersDeleted} imported users deleted`);

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
