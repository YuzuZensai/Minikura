import {
  serial,
  text,
  timestamp,
  pgTable,
  pgSchema,
} from "drizzle-orm/pg-core";

export const server = pgTable("server", {
  id: serial("id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
