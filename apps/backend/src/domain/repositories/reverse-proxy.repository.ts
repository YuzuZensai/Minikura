import type { EnvVariable, ReverseProxyWithEnvVars } from "@minikura/db";
import type { z } from "zod";
import type {
  createReverseProxySchema,
  updateReverseProxySchema,
} from "../../schemas/server.schema";

export type ReverseProxyCreateInput = z.infer<typeof createReverseProxySchema>;
export type ReverseProxyUpdateInput = z.infer<typeof updateReverseProxySchema>;

export interface ReverseProxyRepository {
  findById(id: string, omitSensitive?: boolean): Promise<ReverseProxyWithEnvVars | null>;
  findAll(omitSensitive?: boolean): Promise<ReverseProxyWithEnvVars[]>;
  exists(id: string): Promise<boolean>;
  create(input: ReverseProxyCreateInput): Promise<ReverseProxyWithEnvVars>;
  update(id: string, input: ReverseProxyUpdateInput): Promise<ReverseProxyWithEnvVars>;
  delete(id: string): Promise<void>;
  setEnvVariable(proxyId: string, key: string, value: string): Promise<void>;
  getEnvVariables(proxyId: string): Promise<EnvVariable[]>;
  deleteEnvVariable(proxyId: string, key: string): Promise<void>;
  replaceEnvVariables(proxyId: string, envVars: EnvVariable[]): Promise<void>;
}
