import * as k8s from "@kubernetes/client-node";
import type { CustomResourceSummary } from "@minikura/api";
import { K8sResources } from "./k8s/resources";

const CUSTOM_RESOURCE_GROUP = "minikura.kirameki.cafe";
const CUSTOM_RESOURCE_VERSION = "v1alpha1";

export class K8sService {
  private static instance: K8sService;
  private kc: k8s.KubeConfig;
  private coreApi!: k8s.CoreV1Api;
  private appsApi!: k8s.AppsV1Api;
  private customObjectsApi!: k8s.CustomObjectsApi;
  private networkingApi!: k8s.NetworkingV1Api;
  private namespace: string;
  private initialized: boolean = false;
  private resources!: K8sResources;

  private constructor() {
    this.kc = new k8s.KubeConfig();
    this.namespace = process.env.KUBERNETES_NAMESPACE || "minikura";

    try {
      this.setupConfig();
      this.initializeClients();
      this.resources = new K8sResources(
        this.coreApi,
        this.appsApi,
        this.networkingApi,
        this.namespace,
      );
      this.initialized = true;
    } catch (_error) {
      this.initialized = false;
    }
  }

  private setupConfig(): void {
    const isBun = typeof Bun !== "undefined";

    if (isBun) {
      const { buildKubeConfig } = require("../lib/kube-auth");
      this.kc = buildKubeConfig();
      return;
    }

    try {
      this.kc.loadFromDefault();
      console.log("Loaded Kubernetes config from default location");
    } catch (err) {
      console.warn(
        "Failed to load Kubernetes config from default location:",
        err,
      );
    }

    if (!this.kc.getCurrentContext()) {
      try {
        this.kc.loadFromCluster();
        console.log("Loaded Kubernetes config from cluster");
      } catch (err) {
        console.warn("Failed to load Kubernetes config from cluster:", err);
      }
    }

    if (!this.kc.getCurrentContext()) {
      throw new Error(
        "Failed to setup Kubernetes client - no valid configuration found",
      );
    }

    const currentCluster = this.kc.getCurrentCluster();
    if (currentCluster) {
      console.log(`Connecting to Kubernetes server: ${currentCluster.server}`);
    }
  }

  private initializeClients(): void {
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
    this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
  }

  static getInstance(): K8sService {
    if (!K8sService.instance) {
      K8sService.instance = new K8sService();
    }
    return K8sService.instance;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConnectionInfo(): {
    initialized: boolean;
    currentContext?: string;
    cluster?: string;
    namespace: string;
  } {
    if (!this.initialized) {
      return { initialized: false, namespace: this.namespace };
    }

    try {
      const currentContext = this.kc.getCurrentContext();
      const cluster = this.kc.getCurrentCluster()?.name;
      return {
        initialized: true,
        currentContext,
        cluster,
        namespace: this.namespace,
      };
    } catch (_error) {
      return { initialized: false, namespace: this.namespace };
    }
  }

  async getPods() {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listPods();
    } catch (error: unknown) {
      console.error("Error fetching pods:", error);
      throw new Error(`Failed to fetch pods: ${getErrorMessage(error)}`);
    }
  }

  async getDeployments() {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listDeployments();
    } catch (error: unknown) {
      console.error("Error fetching deployments:", error);
      throw new Error(`Failed to fetch deployments: ${getErrorMessage(error)}`);
    }
  }

  async getStatefulSets() {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listStatefulSets();
    } catch (error: unknown) {
      console.error("Error fetching statefulsets:", error);
      throw new Error(
        `Failed to fetch statefulsets: ${getErrorMessage(error)}`,
      );
    }
  }

  async getServices() {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listServices();
    } catch (error: unknown) {
      console.error("Error fetching services:", error);
      throw new Error(`Failed to fetch services: ${getErrorMessage(error)}`);
    }
  }

  async getConfigMaps() {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listConfigMaps();
    } catch (error: unknown) {
      console.error("Error fetching configmaps:", error);
      throw new Error(`Failed to fetch configmaps: ${getErrorMessage(error)}`);
    }
  }

  async getIngresses() {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listIngresses();
    } catch (error: unknown) {
      console.error("Error fetching ingresses:", error);
      throw new Error(`Failed to fetch ingresses: ${getErrorMessage(error)}`);
    }
  }

  async getCustomResources(
    group: string,
    version: string,
    plural: string,
  ): Promise<CustomResourceSummary[]> {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      type CustomResourceItem = {
        metadata?: {
          name?: string;
          namespace?: string;
          creationTimestamp?: string;
          labels?: Record<string, string>;
        };
        spec?: Record<string, unknown>;
        status?: { phase?: string; [key: string]: unknown };
      };

      const response = await this.customObjectsApi.listNamespacedCustomObject({
        group,
        version,
        namespace: this.namespace,
        plural,
      });
      const body = response as unknown as {
        items?: CustomResourceItem[];
        body?: { items?: CustomResourceItem[] };
      };
      const items = body.items ?? body.body?.items ?? [];
      return items.map((item) => ({
        name: item.metadata?.name,
        namespace: item.metadata?.namespace,
        age: getAge(item.metadata?.creationTimestamp),
        labels: item.metadata?.labels,
        spec: item.spec,
        status: item.status,
      }));
    } catch (error: unknown) {
      console.error(`Error fetching custom resources ${plural}:`, error);
      throw new Error(
        `Failed to fetch custom resources: ${getErrorMessage(error)}`,
      );
    }
  }

  async getMinecraftServers() {
    return this.getCustomResources(
      CUSTOM_RESOURCE_GROUP,
      CUSTOM_RESOURCE_VERSION,
      "minecraftservers",
    );
  }

  async getReverseProxyServers() {
    return this.getCustomResources(
      CUSTOM_RESOURCE_GROUP,
      CUSTOM_RESOURCE_VERSION,
      "reverseproxyservers",
    );
  }

  async getPodLogs(
    podName: string,
    options?: {
      container?: string;
      tailLines?: number;
      timestamps?: boolean;
      sinceSeconds?: number;
    },
  ) {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      const response = await this.coreApi.readNamespacedPodLog({
        name: podName,
        namespace: this.namespace,
        container: options?.container,
        tailLines: options?.tailLines,
        timestamps: options?.timestamps,
        sinceSeconds: options?.sinceSeconds,
      });
      return response;
    } catch (error: unknown) {
      console.error(`Error fetching logs for pod ${podName}:`, error);
      throw new Error(`Failed to fetch pod logs: ${getErrorMessage(error)}`);
    }
  }

  async getPodsByLabel(labelSelector: string) {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listPodsByLabel(labelSelector);
    } catch (error: unknown) {
      console.error("Error fetching pods by label:", error);
      throw new Error(
        `Failed to fetch pods by label: ${getErrorMessage(error)}`,
      );
    }
  }

  async getPodInfo(podName: string) {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.getPodInfo(podName);
    } catch (error: unknown) {
      console.error(`Error fetching pod ${podName}:`, error);
      throw new Error(`Failed to fetch pod info: ${getErrorMessage(error)}`);
    }
  }

  async getServiceInfo(serviceName: string) {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.getServiceInfo(serviceName);
    } catch (error: unknown) {
      console.error(`Error fetching service ${serviceName}:`, error);
      throw new Error(
        `Failed to fetch service info: ${getErrorMessage(error)}`,
      );
    }
  }

  async getNodes() {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      return await this.resources.listNodes();
    } catch (error: unknown) {
      console.error("Error fetching nodes:", error);
      throw new Error(`Failed to fetch nodes: ${getErrorMessage(error)}`);
    }
  }

  async getServerConnectionInfo(serviceName: string) {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }

    try {
      const service = await this.getServiceInfo(serviceName);
      const nodes = await this.getNodes();

      if (service.type === "ClusterIP") {
        return {
          type: "ClusterIP",
          ip: service.clusterIP,
          port: service.ports[0]?.port || null,
          connectionString:
            service.clusterIP && service.ports[0]?.port
              ? `${service.clusterIP}:${service.ports[0].port}`
              : null,
          note: "Only accessible within the cluster",
        };
      }

      if (service.type === "NodePort") {
        const nodeIP = nodes[0]?.externalIP || nodes[0]?.internalIP;
        const nodePort = service.ports[0]?.nodePort;
        return {
          type: "NodePort",
          nodeIP,
          nodePort,
          port: service.ports[0]?.port || null,
          connectionString: nodeIP && nodePort ? `${nodeIP}:${nodePort}` : null,
          note:
            nodeIP && !nodes[0]?.externalIP
              ? "Using internal IP (may not be accessible from outside the cluster network)"
              : "Accessible from any node in the cluster",
        };
      }

      if (service.type === "LoadBalancer") {
        const externalIP =
          service.loadBalancerIP || service.loadBalancerHostname;
        return {
          type: "LoadBalancer",
          externalIP,
          port: service.ports[0]?.port || null,
          connectionString:
            externalIP && service.ports[0]?.port
              ? `${externalIP}:${service.ports[0].port}`
              : null,
          note: !externalIP ? "LoadBalancer IP pending" : null,
        };
      }

      return {
        type: service.type,
        note: "Unknown service type",
      };
    } catch (error: unknown) {
      console.error(
        `Error fetching connection info for service ${serviceName}:`,
        error,
      );
      throw new Error(
        `Failed to fetch connection info: ${getErrorMessage(error)}`,
      );
    }
  }

  getKubeConfig(): k8s.KubeConfig {
    return this.kc;
  }

  getCoreApi(): k8s.CoreV1Api {
    return this.coreApi;
  }

  getNamespace(): string {
    return this.namespace;
  }
}

function getAge(timestamp: Date | string | undefined): string {
  if (!timestamp) return "unknown";
  const now = new Date();
  const created = new Date(timestamp);
  const diff = now.getTime() - created.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
