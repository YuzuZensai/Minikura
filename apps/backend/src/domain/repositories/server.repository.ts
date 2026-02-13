import type { EnvVariable, Server, ServerWithEnvVars } from "@minikura/db";
import type { z } from "zod";
import type { createServerSchema, updateServerSchema } from "../../schemas/server.schema";

export type ServerCreateInput = z.infer<typeof createServerSchema>;
export type ServerUpdateInput = z.infer<typeof updateServerSchema>;

export interface ServerRepository {
  findById(id: string, omitSensitive?: boolean): Promise<ServerWithEnvVars | null>;
  findAll(omitSensitive?: boolean): Promise<ServerWithEnvVars[]>;
  exists(id: string): Promise<boolean>;
  create(input: ServerCreateInput): Promise<ServerWithEnvVars>;
  update(id: string, input: ServerUpdateInput): Promise<ServerWithEnvVars>;
  delete(id: string): Promise<void>;
  setEnvVariable(serverId: string, key: string, value: string): Promise<void>;
  getEnvVariables(serverId: string): Promise<EnvVariable[]>;
  deleteEnvVariable(serverId: string, key: string): Promise<void>;
  replaceEnvVariables(serverId: string, envVars: EnvVariable[]): Promise<void>;
}
