import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
if (!CLIENT_ORIGIN) throw new Error("CLIENT_ORIGIN environment variable is required");

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
if (!BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be set to a random string of 32+ characters");
}

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [CLIENT_ORIGIN],
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  session: {
    expiresIn: 60 * 60 * 24,     // 24 hours
    updateAge: 60 * 60,           // refresh session if older than 1 hour
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
    cookiePrefix: "helpdesk",
  },
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
  databaseHooks: {
    user: {
      update: {
        before: async (userData) => {
          if ("role" in userData) {
            throw new APIError("FORBIDDEN", { message: "Role cannot be changed through this endpoint." });
          }
          return { data: userData };
        },
      },
    },
  },
});
