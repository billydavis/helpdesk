import "dotenv/config";
import { PrismaClient, Role } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Admin user ${email} already exists, skipping.`);
  await prisma.$disconnect();
  process.exit(0);
}

const userId = generateId();
const hashedPassword = await hashPassword(password);

await prisma.user.create({
  data: {
    id: userId,
    name: "Admin",
    email,
    emailVerified: true,
    role: Role.admin,
  },
});

await prisma.account.create({
  data: {
    id: generateId(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
  },
});

console.log(`Admin user created: ${email}`);
await prisma.$disconnect();
