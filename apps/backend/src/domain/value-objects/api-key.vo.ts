export class ApiKey {
  private static readonly SERVER_PREFIX = "minikura_srv_";
  private static readonly REVERSE_PROXY_PREFIX = "minikura_proxy_";
  private static readonly TOKEN_BYTES = 32;

  private constructor(private readonly value: string) {}

  static generate(type: "server" | "reverse-proxy"): ApiKey {
    const prefix = type === "server" ? ApiKey.SERVER_PREFIX : ApiKey.REVERSE_PROXY_PREFIX;
    const token = Buffer.from(crypto.randomUUID())
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, ApiKey.TOKEN_BYTES);
    return new ApiKey(`${prefix}${token}`);
  }

  static validate(value: string): boolean {
    const patterns = [
      new RegExp(`^${ApiKey.SERVER_PREFIX}[a-zA-Z0-9]{32}$`),
      new RegExp(`^${ApiKey.REVERSE_PROXY_PREFIX}[a-zA-Z0-9]{32}$`),
    ];
    return patterns.some((pattern) => pattern.test(value));
  }

  toString(): string {
    return this.value;
  }

  getType(): "server" | "reverse-proxy" {
    if (this.value.startsWith(ApiKey.SERVER_PREFIX)) return "server";
    return "reverse-proxy";
  }
}
