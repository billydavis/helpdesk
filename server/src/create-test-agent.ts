import "dotenv/config";
import { PrismaClient, Role } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";

const email = process.env.AGENT_EMAIL;
const password = process.env.AGENT_PASSWORD;
const name = process.env.AGENT_NAME ?? "Test Agent";

if (!email || !password) {
  console.error("AGENT_EMAIL and AGENT_PASSWORD must be set");
  process.exit(1);
}

if (password.length < 12) {
  console.error("AGENT_PASSWORD must be at least 12 characters (Better Auth minimum)");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Agent user ${email} already exists, skipping.`);
  await prisma.$disconnect();
  process.exit(0);
}

const userId = generateId();
const hashedPassword = await hashPassword(password);

await prisma.user.create({
  data: {
    id: userId,
    name,
    email,
    emailVerified: true,
    role: Role.agent,
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

console.log(`Agent user created: ${email}`);
await prisma.$disconnect();
