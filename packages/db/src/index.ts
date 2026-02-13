import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma";

export * from "./generated/prisma";
export type {
  ReverseProxyCreateInput,
  ReverseProxyServer,
  ReverseProxyUpdateInput,
  ReverseProxyWithEnvVars,
} from "./models/reverse-proxy";
export type {
  EnvVariable,
  Server,
  ServerCreateInput,
  ServerUpdateInput,
  ServerWithEnvVars,
} from "./models/server";

export type { SessionWithUser } from "./models/session";

export { isSessionExpired } from "./models/session";
export type {
  CreateUserInput,
  UpdateSuspensionInput,
  UpdateUserInput,
} from "./models/user";
export { isUserSuspended } from "./models/user";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
