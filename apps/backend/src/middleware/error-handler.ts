import type { Elysia } from "elysia";
import { DomainError } from "../domain/errors/base.error";
import { logger } from "../infrastructure/logger";

export const errorHandler = (app: Elysia) => {
  return app.onError(({ error, set }) => {
    if (error instanceof DomainError) {
      logger.warn({ code: error.code, message: error.message }, "Domain error occurred");
      set.status = error.statusCode;
      return {
        success: false,
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof Error && (error.name === "ValidationError" || error.name === "ZodError")) {
      logger.warn({ err: error, message: error.message }, "Validation error");
      set.status = 400;
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: error.message,
      };
    }

    logger.error({ err: error }, "Unhandled error in API request");

    set.status = 500;
    return {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    };
  });
};
