import type {
  ConnectionInfo,
  K8sNodeSummary,
  NormalServer,
  PodInfo,
  ReverseProxyServer,
} from "@minikura/api";
import type { Edge, Node } from "@xyflow/react";

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export type NodeType = "server" | "proxy" | "k8s-node";

export type EdgeType = "proxy-to-server" | "pod-to-node";

export interface ResourceMetrics {
  cpuUsage?: string;
  memoryUsage?: string;
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
}

export interface K8sNodeMetadata {
  node: K8sNodeSummary;
  podCount: number;
  serverPods: string[]; // Pod names of servers
  proxyPods: string[]; // Pod names of proxies
  health: HealthStatus;
  metrics?: ResourceMetrics;
}

export interface ServerMetadata {
  server: NormalServer;
  podCount: number;
  readyPods: number;
  pods: PodInfo[];
  health: HealthStatus;
  connectedProxies: string[]; // IDs of reverse proxies pointing to this server
  k8sNodes: string[]; // Names of K8s nodes running this server's pods
  connectionInfo?: ConnectionInfo | null;
  metrics?: ResourceMetrics;
}

export interface ProxyMetadata {
  proxy: ReverseProxyServer;
  podCount: number;
  readyPods: number;
  pods: PodInfo[];
  health: HealthStatus;
  connectedServers: string[]; // IDs of servers this proxy routes to
  k8sNodes: string[]; // Names of K8s nodes running this proxy's pods
  connectionInfo?: ConnectionInfo | null;
  metrics?: ResourceMetrics;
}

export type NodeMetadata = ServerMetadata | ProxyMetadata | K8sNodeMetadata;

export interface TopologyNodeData extends Record<string, unknown> {
  id: string;
  type: NodeType;
  label: string;
  status: HealthStatus;
  metadata: NodeMetadata;
}

export interface TopologyEdgeData extends Record<string, unknown> {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  animated?: boolean;
}

export type TopologyNode = Node<TopologyNodeData, string>;
export type TopologyEdge = Edge<TopologyEdgeData, string>;

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  metadata: {
    totalServers: number;
    totalProxies: number;
    totalK8sNodes: number;
    totalConnections: number;
    healthySystems: number;
    degradedSystems: number;
    unhealthySystems: number;
  };
}

export interface TopologyFilters {
  showServers: boolean;
  showProxies: boolean;
  showK8sNodes: boolean;
  showConnections: boolean;
  searchQuery: string;
  filterByStatus?: HealthStatus;
  filterByType?: string;
}
