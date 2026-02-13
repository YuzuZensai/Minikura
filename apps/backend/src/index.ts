import { dotenvLoad } from "dotenv-mono";

dotenvLoad();

import { Elysia } from "elysia";
import { auth } from "./lib/auth";
import { authPlugin } from "./lib/auth-plugin";
import { errorHandler } from "./lib/error-handler";
import { bootstrapRoutes } from "./routes/bootstrap";
import { k8sRoutes } from "./routes/k8s";
import { reverseProxyRoutes } from "./routes/reverse-proxy.routes";
import { serverRoutes } from "./routes/servers";
import { terminalRoutes } from "./routes/terminal";
import { userRoutes } from "./routes/users";

// Register event handlers
import "./infrastructure/event-handlers";

const app = new Elysia()
  .use(errorHandler)
  .onRequest(({ set }) => {
    const origin = process.env.WEB_URL || "http://localhost:3001";
    set.headers["Access-Control-Allow-Origin"] = origin;
    set.headers["Access-Control-Allow-Credentials"] = "true";
    set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cookie";
  })
  .options("/*", () => new Response(null, { status: 204 }))
  .all("/auth/*", ({ request }) => auth.handler(request))
  .use(bootstrapRoutes)
  .use(authPlugin)
  .group("/api", (app) =>
    app.use(userRoutes).use(serverRoutes).use(reverseProxyRoutes).use(k8sRoutes).use(terminalRoutes)
  )
  .get("/health", () => ({ status: "ok" }));

export type App = typeof app;

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
