import type { UpdateUserInput } from "@minikura/db";
import { Elysia } from "elysia";
import { userService } from "../application/di-container";
import { requireAdmin, requireAuth } from "../middleware/auth-guards";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(requireAdmin)
  .get("/", async () => {
    const users = await userService.getAllUsers();
    return users;
  })

  .use(requireAuth)
  .get("/:id", async ({ params }) => {
    const foundUser = await userService.getUserById(params.id);
    return foundUser;
  })

  .use(requireAdmin)
  .patch("/:id", async ({ params, body }) => {
    const input = body as UpdateUserInput;
    const updatedUser = await userService.updateUser(params.id, input);
    return updatedUser;
  })

  .use(requireAuth)
  .delete("/:id", async ({ params, user }) => {
    await userService.deleteUser(user.id, params.id);
    return { success: true };
  });
