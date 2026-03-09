/**
 * Migration + seed script for multi-tenant setup.
 *
 * Run BEFORE `prisma db push` if there are existing projects without userId:
 *   1. First run with old schema to create admin user
 *   2. Then update schema and run `prisma db push`
 *
 * Or run AFTER `prisma db push` if the DB is fresh or already has userId column.
 *
 * Usage: npx tsx prisma/seed.ts
 */
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/db/prisma";
import { uid } from "../src/lib/utils";

async function seed() {
  const adminEmail = "admin@storyforge.local";
  const adminPassword = "storyforge2026";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Upsert admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "admin" },
    create: {
      id: uid("user"),
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: "admin",
    },
  });

  console.log(`Admin user: ${admin.id} (${admin.email}), role: ${admin.role}`);

  // Assign orphan projects to admin
  const result = await prisma.project.updateMany({
    where: {
      OR: [
        { userId: "" },
        { userId: admin.id },
      ],
    },
    data: { userId: admin.id },
  });

  console.log(`Ensured ${result.count} projects belong to admin`);
  console.log("Seed complete!");
  console.log(`\nAdmin credentials:\n  Email: ${adminEmail}\n  Password: ${adminPassword}`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
