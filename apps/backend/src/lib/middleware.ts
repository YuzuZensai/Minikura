type AuthContext = {
  user?: { role?: string | null } | null;
  set: { status?: number | string; headers?: unknown };
  params: Record<string, string>;
  query: Record<string, string>;
  [key: string]: unknown;
};

type ErrorResponse = { error: string };

export const requireAuth = <T extends AuthContext, R>(handler: (context: T) => R) => {
  return (context: T): R | ErrorResponse => {
    if (!context.user) {
      context.set.status = 401;
      return { error: "Unauthorized" };
    }
    return handler(context);
  };
};

export const requireAdmin = <T extends AuthContext, R>(handler: (context: T) => R) => {
  return (context: T): R | ErrorResponse => {
    if (!context.user || context.user.role !== "admin") {
      context.set.status = 403;
      return { error: "Admin access required" };
    }
    return handler(context);
  };
};
