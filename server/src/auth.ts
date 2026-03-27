import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [process.env.CLIENT_ORIGIN!],
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "agent" as const,
        input: false,
      },
    },
  },
});
