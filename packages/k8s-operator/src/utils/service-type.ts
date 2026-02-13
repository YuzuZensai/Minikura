import type { ServiceType } from "@minikura/db";

export function mapServiceType(
  serviceType?: ServiceType | null,
  defaultType: string = "ClusterIP"
): string {
  if (!serviceType) return defaultType;

  switch (serviceType) {
    case "CLUSTER_IP":
      return "ClusterIP";
    case "NODE_PORT":
      return "NodePort";
    case "LOAD_BALANCER":
      return "LoadBalancer";
    default:
      return defaultType;
  }
}
