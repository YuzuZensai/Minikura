import type * as k8s from "@kubernetes/client-node";
import type { CustomResourceSummary } from "@minikura/api";

export interface IK8sService {
  // Initialization
  isInitialized(): boolean;
  getConnectionInfo(): {
    initialized: boolean;
    currentContext?: string;
    cluster?: string;
    namespace: string;
  };

  // Pods
  getPods(): Promise<any[]>;
  getPodsByLabel(labelSelector: string): Promise<any[]>;
  getPodInfo(podName: string): Promise<any>;
  getPodLogs(
    podName: string,
    options?: {
      container?: string;
      tailLines?: number;
      timestamps?: boolean;
      sinceSeconds?: number;
    }
  ): Promise<string>;
  getPodMetrics(namespace?: string): Promise<any>;

  // Workloads
  getDeployments(): Promise<any[]>;
  getStatefulSets(): Promise<any[]>;

  // Network
  getServices(): Promise<any[]>;
  getIngresses(): Promise<any[]>;
  getServiceInfo(serviceName: string): Promise<any>;
  getServerConnectionInfo(serviceName: string): Promise<any>;

  // Configuration
  getConfigMaps(): Promise<any[]>;

  // Custom Resources
  getCustomResources(
    group: string,
    version: string,
    plural: string
  ): Promise<CustomResourceSummary[]>;
  getMinecraftServers(): Promise<CustomResourceSummary[]>;
  getReverseProxyServers(): Promise<CustomResourceSummary[]>;

  // Cluster
  getNodes(): Promise<any[]>;
  getNodeMetrics(): Promise<any>;

  // Low-level access
  getKubeConfig(): k8s.KubeConfig;
  getCoreApi(): k8s.CoreV1Api;
  getNamespace(): string;
}
