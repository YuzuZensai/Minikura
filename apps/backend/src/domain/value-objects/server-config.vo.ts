export class ServerConfig {
  constructor(
    public readonly memory: number,
    public readonly memoryRequest: number,
    public readonly cpuRequest: string,
    public readonly cpuLimit: string,
    public readonly jvmOpts: string | null
  ) {}

  static fromDefaults(): ServerConfig {
    return new ServerConfig(2048, 1024, "250m", "500m", null);
  }

  static fromInput(input: {
    memory?: number;
    memoryRequest?: number;
    cpuRequest?: string;
    cpuLimit?: string;
    jvmOpts?: string;
  }): ServerConfig {
    return new ServerConfig(
      input.memory ?? 2048,
      input.memoryRequest ?? 1024,
      input.cpuRequest ?? "250m",
      input.cpuLimit ?? "500m",
      input.jvmOpts ?? null
    );
  }

  getJvmArgs(): string {
    const args: string[] = ["-Xmx" + this.memory + "M"];

    if (this.jvmOpts) {
      args.push(this.jvmOpts);
    }

    return args.join(" ");
  }
}
