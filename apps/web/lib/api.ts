import { treaty } from "@elysiajs/eden";
import type { App } from "@minikura/backend";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = treaty<App>(baseUrl, {
  fetch: {
    credentials: "include",
  },
});

export type Api = typeof api;
