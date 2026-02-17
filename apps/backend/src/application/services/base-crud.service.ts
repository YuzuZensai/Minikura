import type { EnvVariable } from "@minikura/db";
import { ConflictError, NotFoundError } from "../../domain/errors/base.error";
import { eventBus } from "../../infrastructure/event-bus";

export abstract class BaseCrudService<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TRepository extends {
    findAll(omitSensitive?: boolean): Promise<TEntity[]>;
    findById(id: string, omitSensitive?: boolean): Promise<TEntity | null>;
    exists(id: string): Promise<boolean>;
    create(input: TCreateInput): Promise<TEntity>;
    update(id: string, input: TUpdateInput): Promise<TEntity>;
    delete(id: string): Promise<void>;
    setEnvVariable(entityId: string, key: string, value: string): Promise<void>;
    getEnvVariables(entityId: string): Promise<EnvVariable[]>;
    deleteEnvVariable(entityId: string, key: string): Promise<void>;
  },
  TEvents extends {
    created: new (id: string, type: any, input: TCreateInput) => any;
    updated: new (id: string, input: TUpdateInput) => any;
    deleted: new (id: string) => any;
  },
> {
  constructor(
    protected repository: TRepository,
    protected events: TEvents,
    protected entityName: string
  ) {}

  protected abstract getEntityType(input: TCreateInput): any;
  protected abstract getInputId(input: TCreateInput): string;

  async getAll(omitSensitive = false): Promise<TEntity[]> {
    return this.repository.findAll(omitSensitive);
  }

  async getById(id: string, omitSensitive = false): Promise<TEntity> {
    const entity = await this.repository.findById(id, omitSensitive);
    if (!entity) {
      throw new NotFoundError(this.entityName, id);
    }
    return entity;
  }

  async create(input: TCreateInput): Promise<TEntity> {
    const id = this.getInputId(input);
    const existing = await this.repository.exists(id);
    if (existing) {
      throw new ConflictError(this.entityName, id);
    }

    const entity = await this.repository.create(input);
    const type = this.getEntityType(input);
    await eventBus.publish(new this.events.created(id, type, input));
    return entity;
  }

  async update(id: string, input: TUpdateInput): Promise<TEntity> {
    const entity = await this.repository.update(id, input);
    await eventBus.publish(new this.events.updated(id, input));
    return entity;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    await eventBus.publish(new this.events.deleted(id));
  }

  async setEnvVariable(entityId: string, key: string, value: string): Promise<void> {
    await this.repository.setEnvVariable(entityId, key, value);
  }

  async getEnvVariables(entityId: string): Promise<EnvVariable[]> {
    return this.repository.getEnvVariables(entityId);
  }

  async deleteEnvVariable(entityId: string, key: string): Promise<void> {
    await this.repository.deleteEnvVariable(entityId, key);
  }
}
