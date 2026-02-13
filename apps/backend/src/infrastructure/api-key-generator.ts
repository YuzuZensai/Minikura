export interface ApiKeyGenerator {
  generateServerApiKey(): string;
  generateReverseProxyApiKey(): string;
}

export class ApiKeyGeneratorImpl implements ApiKeyGenerator {
  private readonly SERVER_PREFIX = "minikura_srv_";
  private readonly REVERSE_PROXY_PREFIX = "minikura_proxy_";
  private readonly TOKEN_LENGTH = 32;

  generateServerApiKey(): string {
    const token = Buffer.from(crypto.randomUUID())
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, this.TOKEN_LENGTH);
    return `${this.SERVER_PREFIX}${token}`;
  }

  generateReverseProxyApiKey(): string {
    const token = Buffer.from(crypto.randomUUID())
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, this.TOKEN_LENGTH);
    return `${this.REVERSE_PROXY_PREFIX}${token}`;
  }
}
