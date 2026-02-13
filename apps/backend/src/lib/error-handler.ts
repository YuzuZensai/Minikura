import type { Elysia } from "elysia";
import { DomainError } from "../domain/errors/base.error";

export const errorHandler = (app: Elysia) => {
  return app.onError(({ error, set }) => {
    if (error instanceof DomainError) {
      set.status = error.statusCode;
      return {
        success: false,
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof Error && (error.name === "ValidationError" || error.name === "ZodError")) {
      set.status = 400;
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: error.message,
      };
    }

    console.error("Unhandled error:", error);

    set.status = 500;
    return {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    };
  });
};
