import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

console.log(process.env.DATABASE_URL);

// for migrations
const migrationClient = postgres(process.env.DATABASE_URL || "", { max: 1 });
// migrate(drizzle(migrationClient), ...)

// for query purposes
const queryClient = postgres(process.env.DATABASE_URL || "");
export const db = drizzle(queryClient, { schema });
