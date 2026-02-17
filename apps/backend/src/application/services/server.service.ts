import type { ServerWithEnvVars } from "@minikura/db";
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
import type { K8sService } from "../../services/k8s";
import type { IServerService } from "../interfaces/server.service.interface";
import { BaseCrudService } from "./base-crud.service";

export class ServerService
  extends BaseCrudService<
    ServerWithEnvVars,
    ServerCreateInput,
    ServerUpdateInput,
    ServerRepository,
    {
      created: typeof ServerCreatedEvent;
      updated: typeof ServerUpdatedEvent;
      deleted: typeof ServerDeletedEvent;
    }
  >
  implements IServerService
{
  constructor(
    serverRepo: ServerRepository,
    private k8sService: K8sService
  ) {
    super(
      serverRepo,
      {
        created: ServerCreatedEvent,
        updated: ServerUpdatedEvent,
        deleted: ServerDeletedEvent,
      },
      "Server"
    );
  }

  protected getEntityType(input: ServerCreateInput) {
    return input.type;
  }

  protected getInputId(input: ServerCreateInput): string {
    return input.id;
  }

  getAllServers(omitSensitive = false) {
    return this.getAll(omitSensitive);
  }

  getServerById(id: string, omitSensitive = false) {
    return this.getById(id, omitSensitive);
  }

  createServer(input: ServerCreateInput) {
    return this.create(input);
  }

  updateServer(id: string, input: ServerUpdateInput) {
    return this.update(id, input);
  }

  deleteServer(id: string) {
    return this.delete(id);
  }

  async getConnectionInfo(serverId: string) {
    await this.getServerById(serverId);
    const serviceName = `minecraft-${serverId}`;
    return this.k8sService.getServerConnectionInfo(serviceName);
  }
}
