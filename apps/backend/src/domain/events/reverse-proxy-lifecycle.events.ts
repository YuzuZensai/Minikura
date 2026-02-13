import { DomainEvent } from "./domain-event";
import type { ReverseProxyType } from "../entities/enums";
import type { ReverseProxyCreateInput, ReverseProxyUpdateInput } from "../repositories/reverse-proxy.repository";

export class ReverseProxyCreatedEvent extends DomainEvent {
  constructor(
    public readonly proxyId: string,
    public readonly proxyType: ReverseProxyType,
    public readonly config: ReverseProxyCreateInput
  ) {
    super();
  }
}

export class ReverseProxyUpdatedEvent extends DomainEvent {
  constructor(
    public readonly proxyId: string,
    public readonly changes: ReverseProxyUpdateInput
  ) {
    super();
  }
}

export class ReverseProxyDeletedEvent extends DomainEvent {
  constructor(public readonly proxyId: string) {
    super();
  }
}
