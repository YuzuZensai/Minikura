import { Elysia } from "elysia";
import { z } from "zod";
import { serverService, wsService } from "../application/di-container";
import { createServerSchema, updateServerSchema } from "../schemas/server.schema";
import type { WebSocketClient } from "../services/websocket";

const envVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const serverRoutes = new Elysia({ prefix: "/servers" })
  .ws("/ws", {
    open(ws: WebSocketClient & { data?: { query?: Record<string, string> }; close: () => void }) {
      if (!ws.data?.query?.apiKey) {
        ws.close();
        return;
      }
      wsService.addClient(ws);
    },
    close(ws: WebSocketClient) {
      wsService.removeClient(ws);
    },
    message() {},
  })
  .get("/", async () => {
    return await serverService.getAllServers(false);
  })

  .get("/:id", async ({ params }) => {
    return await serverService.getServerById(params.id, false);
  })

  .get("/:id/connection-info", async ({ params }) => {
    return await serverService.getConnectionInfo(params.id);
  })

  .post("/", async ({ body }) => {
    const payload = createServerSchema.parse(body);
    const server = await serverService.createServer(payload);
    return server;
  })

  .patch("/:id", async ({ params, body }) => {
    const payload = updateServerSchema.parse(body);
    const server = await serverService.updateServer(params.id, payload);
    return server;
  })

  .delete("/:id", async ({ params }) => {
    await serverService.deleteServer(params.id);
    return { success: true };
  })

  .get("/:id/env", async ({ params }) => {
    const envVariables = await serverService.getEnvVariables(params.id);
    return { env_variables: envVariables };
  })

  .post("/:id/env", async ({ params, body }) => {
    const payload = envVariableSchema.parse(body);
    await serverService.setEnvVariable(params.id, payload.key, payload.value);
    return { success: true };
  })

  .delete("/:id/env/:key", async ({ params }) => {
    await serverService.deleteEnvVariable(params.id, params.key);
    return { success: true };
  });
