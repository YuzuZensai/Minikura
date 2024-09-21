import { edenTreaty } from "@elysiajs/eden";
import type { App } from "@minikura/backend";

export const api = edenTreaty<App>("http://localhost:3000");
