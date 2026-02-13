import type { DomainEvent } from "../domain/events/domain-event";

type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private eventHistory: DomainEvent[] = [];

  subscribe<T extends DomainEvent>(
    eventClass: { new (...args: any[]): T },
    handler: EventHandler<T>
  ): () => void {
    const eventName = eventClass.name;
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler as EventHandler);
    return () => {
      this.handlers.get(eventName)?.delete(handler as EventHandler);
    };
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    this.eventHistory.push(event);
    const eventName = event.constructor.name;
    const handlers = this.handlers.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${eventName}:`, error);
      }
    }
  }

  getHistory(): DomainEvent[] {
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}

export const eventBus = new EventBus();
