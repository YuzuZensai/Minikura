import type { EnvVariable, ServerWithEnvVars } from "@minikura/db";
import type {
  ServerCreateInput,
  ServerUpdateInput,
} from "../../domain/repositories/server.repository";

export interface IServerService {
  getAllServers(omitSensitive?: boolean): Promise<ServerWithEnvVars[]>;
  getServerById(id: string, omitSensitive?: boolean): Promise<ServerWithEnvVars>;
  createServer(input: ServerCreateInput): Promise<ServerWithEnvVars>;
  updateServer(id: string, input: ServerUpdateInput): Promise<ServerWithEnvVars>;
  deleteServer(id: string): Promise<void>;
  setEnvVariable(serverId: string, key: string, value: string): Promise<void>;
  getEnvVariables(serverId: string): Promise<EnvVariable[]>;
  deleteEnvVariable(serverId: string, key: string): Promise<void>;
  getConnectionInfo(serverId: string): Promise<any>;
}
