import type { EnvVariable, ReverseProxyWithEnvVars } from "@minikura/db";
import { ConflictError, NotFoundError } from "../../domain/errors/base.error";
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
import { eventBus } from "../../infrastructure/event-bus";

export class ReverseProxyService {
  constructor(private reverseProxyRepo: ReverseProxyRepository) {}

  async getAllReverseProxies(
    omitSensitive = false,
  ): Promise<ReverseProxyWithEnvVars[]> {
    return this.reverseProxyRepo.findAll(omitSensitive);
  }

  async getReverseProxyById(
    id: string,
    omitSensitive = false,
  ): Promise<ReverseProxyWithEnvVars> {
    const proxy = await this.reverseProxyRepo.findById(id, omitSensitive);
    if (!proxy) {
      throw new NotFoundError("ReverseProxyServer", id);
    }
    return proxy;
  }

  async createReverseProxy(
    input: ReverseProxyCreateInput,
  ): Promise<ReverseProxyWithEnvVars> {
    const id = typeof input.id === "string" ? input.id : String(input.id);
    const existing = await this.reverseProxyRepo.exists(id);
    if (existing) {
      throw new ConflictError("ReverseProxyServer", id);
    }

    const proxy = await this.reverseProxyRepo.create(input);
    await eventBus.publish(
      new ReverseProxyCreatedEvent(proxy.id, proxy.type, input),
    );
    return proxy;
  }

  async updateReverseProxy(
    id: string,
    input: ReverseProxyUpdateInput,
  ): Promise<ReverseProxyWithEnvVars> {
    const proxy = await this.reverseProxyRepo.update(id, input);
    await eventBus.publish(new ReverseProxyUpdatedEvent(id, input));
    return proxy;
  }

  async deleteReverseProxy(id: string): Promise<void> {
    await this.reverseProxyRepo.delete(id);
    await eventBus.publish(new ReverseProxyDeletedEvent(id));
  }

  async setEnvVariable(
    proxyId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.reverseProxyRepo.setEnvVariable(proxyId, key, value);
  }

  async getEnvVariables(proxyId: string): Promise<EnvVariable[]> {
    return this.reverseProxyRepo.getEnvVariables(proxyId);
  }

  async deleteEnvVariable(proxyId: string, key: string): Promise<void> {
    await this.reverseProxyRepo.deleteEnvVariable(proxyId, key);
  }
}
