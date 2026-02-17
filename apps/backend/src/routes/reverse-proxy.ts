import { Elysia } from "elysia";
import { z } from "zod";
import { reverseProxyService } from "../application/di-container";
import { requireAuth } from "../middleware/auth-guards";
import { createReverseProxySchema, updateReverseProxySchema } from "../schemas/server.schema";

const envVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const reverseProxyRoutes = new Elysia({ prefix: "/reverse-proxy" })
  .use(requireAuth)
  .get("/", async () => {
    return await reverseProxyService.getAllReverseProxies(false);
  })

  .get("/:id", async ({ params }) => {
    return await reverseProxyService.getReverseProxyById(params.id, false);
  })

  .post("/", async ({ body }) => {
    const payload = createReverseProxySchema.parse(body);
    const proxy = await reverseProxyService.createReverseProxy(payload);
    return proxy;
  })

  .patch("/:id", async ({ params, body }) => {
    const payload = updateReverseProxySchema.parse(body);
    const proxy = await reverseProxyService.updateReverseProxy(params.id, payload);
    return proxy;
  })

  .delete("/:id", async ({ params }) => {
    await reverseProxyService.deleteReverseProxy(params.id);
    return { success: true };
  })

  .get("/:id/env", async ({ params }) => {
    const envVariables = await reverseProxyService.getEnvVariables(params.id);
    return { env_variables: envVariables };
  })

  .post("/:id/env", async ({ params, body }) => {
    const payload = envVariableSchema.parse(body);
    await reverseProxyService.setEnvVariable(params.id, payload.key, payload.value);
    return { success: true };
  })

  .delete("/:id/env/:key", async ({ params }) => {
    await reverseProxyService.deleteEnvVariable(params.id, params.key);
    return { success: true };
  });
