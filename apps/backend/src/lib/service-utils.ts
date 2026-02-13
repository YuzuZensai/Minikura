export function createSensitiveFieldSelector<T extends Record<string, boolean>>(
  fields: T
): T & { api_key?: false } {
  return {
    ...fields,
    api_key: false,
  } as T & { api_key?: false };
}

export function pickDefined<T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  keys: K[]
): Partial<Pick<T, K>> {
  return keys.reduce(
    (result, key) => {
      if (source[key] !== undefined) {
        result[key] = source[key];
      }
      return result;
    },
    {} as Partial<Pick<T, K>>
  );
}

export function generateApiKey(prefix: string): string {
  const crypto = require("node:crypto");
  let token = crypto.randomBytes(64).toString("hex");
  token = token
    .split("")
    .map((char: string) => (Math.random() > 0.5 ? char.toUpperCase() : char))
    .join("");
  return `${prefix}${token}`;
}
