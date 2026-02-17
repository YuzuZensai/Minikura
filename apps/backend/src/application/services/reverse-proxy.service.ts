import type { ReverseProxyWithEnvVars } from "@minikura/db";
import {
  ReverseProxyCreatedEvent,
  ReverseProxyDeletedEvent,
  ReverseProxyUpdatedEvent,
} from "../../domain/events/reverse-proxy-lifecycle.events";
import type {
  ReverseProxyCreateInput,
  ReverseProxyRepository,
  ReverseProxyUpdateInput,
} from "../../domain/repositories/reverse-proxy.repository";
import type { IReverseProxyService } from "../interfaces/reverse-proxy.service.interface";
import { BaseCrudService } from "./base-crud.service";

export class ReverseProxyService
  extends BaseCrudService<
    ReverseProxyWithEnvVars,
    ReverseProxyCreateInput,
    ReverseProxyUpdateInput,
    ReverseProxyRepository,
    {
      created: typeof ReverseProxyCreatedEvent;
      updated: typeof ReverseProxyUpdatedEvent;
      deleted: typeof ReverseProxyDeletedEvent;
    }
  >
  implements IReverseProxyService
{
  constructor(reverseProxyRepo: ReverseProxyRepository) {
    super(
      reverseProxyRepo,
      {
        created: ReverseProxyCreatedEvent,
        updated: ReverseProxyUpdatedEvent,
        deleted: ReverseProxyDeletedEvent,
      },
      "ReverseProxyServer"
    );
  }

  protected getEntityType(input: ReverseProxyCreateInput) {
    return input.type || "VELOCITY";
  }

  protected getInputId(input: ReverseProxyCreateInput): string {
    return typeof input.id === "string" ? input.id : String(input.id);
  }

  getAllReverseProxies(omitSensitive = false) {
    return this.getAll(omitSensitive);
  }

  getReverseProxyById(id: string, omitSensitive = false) {
    return this.getById(id, omitSensitive);
  }

  createReverseProxy(input: ReverseProxyCreateInput) {
    return this.create(input);
  }

  updateReverseProxy(id: string, input: ReverseProxyUpdateInput) {
    return this.update(id, input);
  }

  deleteReverseProxy(id: string) {
    return this.delete(id);
  }
}
