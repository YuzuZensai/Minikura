import * as k8s from "@kubernetes/client-node";
import { SKIP_TLS_VERIFY, NAMESPACE } from "../config/constants";

export class KubernetesClient {
  private static instance: KubernetesClient;
  private kc: k8s.KubeConfig;
  private appsApi!: k8s.AppsV1Api;
  private coreApi!: k8s.CoreV1Api;
  private networkingApi!: k8s.NetworkingV1Api;
  private customObjectsApi!: k8s.CustomObjectsApi;
  private apiExtensionsApi!: k8s.ApiextensionsV1Api;

  private constructor() {
    if (SKIP_TLS_VERIFY) {
      console.log("Disabling TLS certificate validation");
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    this.kc = new k8s.KubeConfig();
    this.setupConfig();
    this.initializeClients();
  }

  static getInstance(): KubernetesClient {
    if (!KubernetesClient.instance) {
      KubernetesClient.instance = new KubernetesClient();
    }
    return KubernetesClient.instance;
  }

  private setupConfig(): void {
    try {
      this.kc.loadFromDefault();
      console.log("Loaded Kubernetes config from default location");
    } catch (err) {
      console.warn("Failed to load Kubernetes config from default location:", err);
    }

    // Running in a cluster, try to load in-cluster config
    if (!this.kc.getCurrentContext()) {
      try {
        this.kc.loadFromCluster();
        console.log("Loaded Kubernetes config from cluster");
      } catch (err) {
        console.warn("Failed to load Kubernetes config from cluster:", err);
      }
    }

    if (!this.kc.getCurrentContext()) {
      throw new Error("Failed to setup Kubernetes client - no valid configuration found");
    }

    const currentCluster = this.kc.getCurrentCluster();
    if (currentCluster) {
      console.log(`Connecting to Kubernetes server: ${currentCluster.server}`);
    }
  }

  private initializeClients(): void {
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
    this.apiExtensionsApi = this.kc.makeApiClient(k8s.ApiextensionsV1Api);
  }

  getKubeConfig(): k8s.KubeConfig {
    return this.kc;
  }

  getAppsApi(): k8s.AppsV1Api {
    return this.appsApi;
  }

  getCoreApi(): k8s.CoreV1Api {
    return this.coreApi;
  }

  getNetworkingApi(): k8s.NetworkingV1Api {
    return this.networkingApi;
  }

  getCustomObjectsApi(): k8s.CustomObjectsApi {
    return this.customObjectsApi;
  }

  getApiExtensionsApi(): k8s.ApiextensionsV1Api {
    return this.apiExtensionsApi;
  }

  async handleApiError(error: any, context: string): Promise<never> {
    console.error(`Kubernetes API error (${context}):`, error?.message || error);

    if (error?.response) {
      console.error(`Response status: ${error.response.statusCode}`);
      console.error(`Response body: ${JSON.stringify(error.response.body)}`);
    }

    throw error;
  }
}
