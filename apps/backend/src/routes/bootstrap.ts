import { prisma } from "@minikura/db";
import { getErrorMessage } from "@minikura/shared/errors";
import { Elysia } from "elysia";
import { logger } from "../infrastructure/logger";
import { auth } from "../middleware/auth";
import { bootstrapSchema } from "../schemas/bootstrap.schema";

export const bootstrapRoutes = new Elysia({ prefix: "/bootstrap" })
  .get("/status", async () => {
    const userCount = await prisma.user.count();
    return { needsSetup: userCount === 0 };
  })
  .post("/setup", async ({ body, set }) => {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      set.status = 400;
      return { message: "Setup already completed" };
    }

    const validated = bootstrapSchema.safeParse(body);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      set.status = 400;
      return {
        message: `${firstError.path.join(".")}: ${firstError.message}`,
      };
    }
    const data = validated.data;

    try {
      const result = await auth.api.createUser({
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          role: "admin",
        },
      });

      if (!result.user) {
        logger.error({ result }, "No user in bootstrap response");
        set.status = 500;
        return { message: "Failed to create user" };
      }

      return { success: true };
    } catch (err: unknown) {
      logger.error({ err }, "Bootstrap setup failed");
      set.status = 500;
      return { message: getErrorMessage(err) };
    }
  });
