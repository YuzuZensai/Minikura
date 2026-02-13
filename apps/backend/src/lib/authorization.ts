import type { User } from "@minikura/db";
import type { Elysia } from "elysia";
import { ForbiddenError, UnauthorizedError } from "../domain/errors/base.error";

export const requireAuth = (app: Elysia) => {
  return app.derive((ctx: any) => {
    const { user, isSuspended } = ctx as {
      user: User | null;
      isSuspended: boolean;
    };
    if (!user) {
      throw new UnauthorizedError();
    }
    if (isSuspended) {
      throw new ForbiddenError("Account is suspended");
    }
    return { user };
  });
};

export const requireAdmin = (app: Elysia) => {
  return app.derive((ctx: any) => {
    const { user, isSuspended } = ctx as {
      user: User | null;
      isSuspended: boolean;
    };
    if (!user) {
      throw new UnauthorizedError();
    }
    if (isSuspended) {
      throw new ForbiddenError("Account is suspended");
    }
    if (user.role !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
    return { user };
  });
};

export const requireRole = (role: string) => (app: Elysia) => {
  return app.derive((ctx: any) => {
    const { user, isSuspended } = ctx as {
      user: User | null;
      isSuspended: boolean;
    };
    if (!user) {
      throw new UnauthorizedError();
    }
    if (isSuspended) {
      throw new ForbiddenError("Account is suspended");
    }
    if (user.role !== role) {
      throw new ForbiddenError(`${role} access required`);
    }
    return { user };
  });
};
