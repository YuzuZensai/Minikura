import { PrismaClient } from '@minikura/db';
import { KubernetesClient } from '../utils/k8s-client';
import { SYNC_INTERVAL } from '../config/constants';

export abstract class BaseController {
  protected prisma: PrismaClient;
  protected k8sClient: KubernetesClient;
  protected namespace: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(prisma: PrismaClient, namespace: string) {
    this.prisma = prisma;
    this.k8sClient = KubernetesClient.getInstance();
    this.namespace = namespace;
  }

  /**
   * Start watching for changes in the database and syncing to Kubernetes
   */
  public startWatching(): void {
    console.log(`Starting to watch for changes in ${this.getControllerName()}...`);
    
    // Initial sync
    this.syncResources().catch(err => {
      console.error(`Error during initial sync of ${this.getControllerName()}:`, err);
    });
    
    // Polling interval for changes
    // TODO: Maybe there's a better way to do this
    this.intervalId = setInterval(() => {
      this.syncResources().catch(err => {
        console.error(`Error syncing ${this.getControllerName()}:`, err);
      });
    }, SYNC_INTERVAL);
  }

  /**
   * Stop watching for changes
   */
  public stopWatching(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log(`Stopped watching for changes in ${this.getControllerName()}`);
    }
  }

  /**
   * Get a name for this controller for logging purposes
   */
  protected abstract getControllerName(): string;

  /**
   * Sync resources from database to Kubernetes
   */
  protected abstract syncResources(): Promise<void>;
} 