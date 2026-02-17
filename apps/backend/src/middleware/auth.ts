import { prisma } from "@minikura/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, openAPI } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: false,
  }),
  emailAndPassword: { enabled: true },
  plugins: [admin(), openAPI()],
  trustedOrigins: [process.env.WEB_URL || "http://localhost:3001"],
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  basePath: "/auth",
});

export type Auth = typeof auth;
