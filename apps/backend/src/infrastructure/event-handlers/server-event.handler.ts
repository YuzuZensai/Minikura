import {
  ServerCreatedEvent,
  ServerDeletedEvent,
  ServerUpdatedEvent,
} from "../../domain/events/server-lifecycle.events";
import { eventBus } from "../event-bus";
import { wsService } from "../../application/di-container";

eventBus.subscribe(ServerCreatedEvent, async (event) => {
  console.log(`[Event] Server created: ${event.serverId} (${event.serverType})`);
  wsService.broadcast("create", event.serverType, event.serverId);
});

eventBus.subscribe(ServerUpdatedEvent, async (event) => {
  console.log(`[Event] Server updated: ${event.serverId}`);
  wsService.broadcast("update", "server", event.serverId);
});

eventBus.subscribe(ServerDeletedEvent, async (event) => {
  console.log(`[Event] Server deleted: ${event.serverId}`);
  wsService.broadcast("delete", "server", event.serverId);
});
