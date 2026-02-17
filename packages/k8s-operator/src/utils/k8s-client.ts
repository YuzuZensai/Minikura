import * as k8s from "@kubernetes/client-node";
import { buildKubeConfig } from "@minikura/shared/kube-auth";
import { logger } from "./logger";

export class KubernetesClient {
  private static instance: KubernetesClient;
  private kc: k8s.KubeConfig;
  private appsApi!: k8s.AppsV1Api;
  private coreApi!: k8s.CoreV1Api;
  private networkingApi!: k8s.NetworkingV1Api;
  private customObjectsApi!: k8s.CustomObjectsApi;
  private apiExtensionsApi!: k8s.ApiextensionsV1Api;

  private constructor() {
    this.kc = buildKubeConfig();
    this.initializeClients();
  }

  static getInstance(): KubernetesClient {
    if (!KubernetesClient.instance) {
      KubernetesClient.instance = new KubernetesClient();
    }
    return KubernetesClient.instance;
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
    logger.error(
      {
        context,
        message: error?.message,
        statusCode: error?.response?.statusCode,
        body: error?.response?.body,
      },
      "Kubernetes API error"
    );

    throw error;
  }
}
