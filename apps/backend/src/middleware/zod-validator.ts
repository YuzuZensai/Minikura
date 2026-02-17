import type { z } from "zod";

type ErrorHandler = (code: number, value: unknown) => never;

export function validateBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
  error: ErrorHandler
): z.infer<T> {
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const message = `${firstError.path.join(".")}: ${firstError.message}`;
    throw error(400, { message });
  }

  return result.data;
}

export function zodValidate<T extends z.ZodType>(schema: T) {
  return (context: { body: unknown; error: ErrorHandler }) => {
    return validateBody(schema, context.body, context.error);
  };
}
