import {
  UserSuspendedEvent,
  UserUnsuspendedEvent,
} from "../../domain/events/server-lifecycle.events";
import { eventBus } from "../event-bus";

eventBus.subscribe(UserSuspendedEvent, async (event) => {
  if (event.suspendedUntil) {
    console.log(
      `[Event] User suspended: ${event.userId} until ${event.suspendedUntil.toISOString()}`
    );
  } else {
    console.log(`[Event] User suspended: ${event.userId} indefinitely`);
  }
});

eventBus.subscribe(UserUnsuspendedEvent, async (event) => {
  console.log(`[Event] User unsuspended: ${event.userId}`);
});
