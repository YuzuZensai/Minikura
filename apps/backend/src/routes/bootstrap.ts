import { prisma } from "@minikura/db";
import { Elysia } from "elysia";
import { auth } from "../lib/auth";
import { getErrorMessage } from "../lib/errors";
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
        console.error("No user in response:", result);
        set.status = 500;
        return { message: "Failed to create user" };
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Bootstrap setup error:", err);
      set.status = 500;
      return { message: getErrorMessage(err) };
    }
  });
