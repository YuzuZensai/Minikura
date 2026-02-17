import { createLogger } from "@minikura/shared";
import pg from "pg";

const logger = createLogger("notification-service");

export class NotificationService {
  private pgClient: pg.Client | null = null;
  private handlers = new Map<string, Set<(payload: unknown) => void | Promise<void>>>();

  async connect(connectionString: string): Promise<void> {
    if (!connectionString) {
      throw new Error("Database connection string is required");
    }

    logger.info("Connecting to PostgreSQL");
    this.pgClient = new pg.Client({ connectionString });
    await this.pgClient.connect();

    this.pgClient.on("notification", async (msg) => {
      const handlers = this.handlers.get(msg.channel);
      if (!handlers) return;

      try {
        const payload = msg.payload ? JSON.parse(msg.payload) : {};
        logger.info({ channel: msg.channel, payload }, "Received notification");

        for (const handler of handlers) {
          try {
            await handler(payload);
          } catch (err) {
            logger.error({ err, channel: msg.channel }, "Error in notification handler");
          }
        }
      } catch (err) {
        logger.error({ err }, "Failed to parse notification payload");
      }
    });

    logger.info("Connected to PostgreSQL successfully");
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
      logger.info({ channel }, "Listening on channel");
    }

    this.handlers.get(channel)?.add(handler);
  }

  async unlisten(channel: string): Promise<void> {
    if (!this.pgClient) return;

    this.handlers.delete(channel);
    await this.pgClient.query(`UNLISTEN ${channel}`);
    logger.info({ channel }, "Stopped listening on channel");
  }

  async disconnect(): Promise<void> {
    if (!this.pgClient) return;

    logger.info("Disconnecting from PostgreSQL");
    await this.pgClient.end();
    this.pgClient = null;
    this.handlers.clear();
    logger.info("Disconnected from PostgreSQL");
  }

  isConnected(): boolean {
    return this.pgClient !== null;
  }
}
