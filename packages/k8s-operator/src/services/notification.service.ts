import pg from "pg";

export class NotificationService {
  private pgClient: pg.Client | null = null;
  private handlers = new Map<string, Set<(payload: unknown) => void | Promise<void>>>();

  async connect(connectionString: string): Promise<void> {
    if (!connectionString) {
      throw new Error("Database connection string is required");
    }

    console.log("\n[NotificationService] Connecting to PostgreSQL...");
    this.pgClient = new pg.Client({ connectionString });
    await this.pgClient.connect();

    this.pgClient.on("notification", async (msg) => {
      const handlers = this.handlers.get(msg.channel);
      if (!handlers) return;

      try {
        const payload = msg.payload ? JSON.parse(msg.payload) : {};
        console.log(
          `\n[NotificationService] Received notification on channel '${msg.channel}':`,
          payload
        );

        for (const handler of handlers) {
          try {
            await handler(payload);
          } catch (err) {
            console.error(
              `[NotificationService] Error in handler for channel '${msg.channel}':`,
              err
            );
          }
        }
      } catch (err) {
        console.error(`[NotificationService] Failed to parse notification payload:`, err);
      }
    });

    console.log("[NotificationService] Connected successfully");
  }

  async listen(
    channel: string,
    handler: (payload: unknown) => void | Promise<void>
  ): Promise<void> {
    if (!this.pgClient) {
      throw new Error("NotificationService not connected");
    }

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.pgClient.query(`LISTEN ${channel}`);
      console.log(`[NotificationService] Listening on channel: ${channel}`);
    }

    this.handlers.get(channel)!.add(handler);
  }

  async unlisten(channel: string): Promise<void> {
    if (!this.pgClient) return;

    this.handlers.delete(channel);
    await this.pgClient.query(`UNLISTEN ${channel}`);
    console.log(`[NotificationService] Stopped listening on channel: ${channel}`);
  }

  async disconnect(): Promise<void> {
    if (!this.pgClient) return;

    console.log("\n[NotificationService] Disconnecting...");
    await this.pgClient.end();
    this.pgClient = null;
    this.handlers.clear();
    console.log("[NotificationService] Disconnected");
  }

  isConnected(): boolean {
    return this.pgClient !== null;
  }
}
