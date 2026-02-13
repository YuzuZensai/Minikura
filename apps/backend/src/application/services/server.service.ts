import type { EnvVariable, ServerWithEnvVars } from "@minikura/db";
import { ConflictError, NotFoundError } from "../../domain/errors/base.error";
import {
  ServerCreatedEvent,
  ServerDeletedEvent,
  ServerUpdatedEvent,
} from "../../domain/events/server-lifecycle.events";
import type {
  ServerCreateInput,
  ServerRepository,
  ServerUpdateInput,
} from "../../domain/repositories/server.repository";
import { eventBus } from "../../infrastructure/event-bus";
import type { K8sService } from "../../services/k8s";

export class ServerService {
  constructor(
    private serverRepo: ServerRepository,
    private k8sService: K8sService,
  ) {}

  async getAllServers(omitSensitive = false): Promise<ServerWithEnvVars[]> {
    return this.serverRepo.findAll(omitSensitive);
  }

  async getServerById(
    id: string,
    omitSensitive = false,
  ): Promise<ServerWithEnvVars> {
    const server = await this.serverRepo.findById(id, omitSensitive);
    if (!server) {
      throw new NotFoundError("Server", id);
    }
    return server;
  }

  async createServer(input: ServerCreateInput): Promise<ServerWithEnvVars> {
    const existing = await this.serverRepo.exists(input.id);
    if (existing) {
      throw new ConflictError("Server", input.id);
    }

    const server = await this.serverRepo.create(input);
    await eventBus.publish(
      new ServerCreatedEvent(server.id, server.type, input),
    );
    return server;
  }

  async updateServer(
    id: string,
    input: ServerUpdateInput,
  ): Promise<ServerWithEnvVars> {
    const server = await this.serverRepo.update(id, input);
    await eventBus.publish(new ServerUpdatedEvent(id, input));
    return server;
  }

  async deleteServer(id: string): Promise<void> {
    await this.serverRepo.delete(id);
    await eventBus.publish(new ServerDeletedEvent(id));
  }

  async setEnvVariable(
    serverId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.serverRepo.setEnvVariable(serverId, key, value);
  }

  async getEnvVariables(serverId: string): Promise<EnvVariable[]> {
    return this.serverRepo.getEnvVariables(serverId);
  }

  async deleteEnvVariable(serverId: string, key: string): Promise<void> {
    await this.serverRepo.deleteEnvVariable(serverId, key);
  }

  async getConnectionInfo(serverId: string) {
    await this.getServerById(serverId);
    const serviceName = `minecraft-${serverId}`;
    return this.k8sService.getServerConnectionInfo(serviceName);
  }
}
