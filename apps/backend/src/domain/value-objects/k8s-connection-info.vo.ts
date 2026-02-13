export class K8sConnectionInfo {
  constructor(
    public readonly host: string,
    public readonly port: number,
    public readonly namespace: string
  ) {}

  toUrl(): string {
    return `${this.host}:${this.port}`;
  }

  toConnectionString(): string {
    return `Host: ${this.host}, Port: ${this.port}, Namespace: ${this.namespace}`;
  }
}
