import type { PrismaClient } from "@minikura/db";
import type { Logger } from "pino";
import { SYNC_INTERVAL } from "../config/constants";
import { KubernetesClient } from "../utils/k8s-client";
import { createLogger } from "../utils/logger";

export abstract class BaseController {
  protected prisma: PrismaClient;
  protected k8sClient: KubernetesClient;
  protected namespace: string;
  protected logger: Logger;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(prisma: PrismaClient, namespace: string) {
    this.prisma = prisma;
    this.k8sClient = KubernetesClient.getInstance();
    this.namespace = namespace;
    this.logger = createLogger({ controller: this.getControllerName() });
  }

  public startWatching(): void {
    this.logger.info(
      { namespace: this.namespace, syncInterval: SYNC_INTERVAL },
      "Starting controller watch loop"
    );

    this.syncResources().catch((err) => {
      this.logger.error({ err }, "Error during initial resource synchronization");
    });

    this.intervalId = setInterval(() => {
      this.syncResources().catch((err) => {
        this.logger.error({ err }, "Error during periodic resource synchronization");
      });
    }, SYNC_INTERVAL);

    this.logger.debug(
      { intervalMs: SYNC_INTERVAL },
      "Polling interval established for resource synchronization"
    );
  }

  public stopWatching(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info("Controller watch loop stopped");
    }
  }

  protected abstract getControllerName(): string;
  protected abstract syncResources(): Promise<void>;
}
