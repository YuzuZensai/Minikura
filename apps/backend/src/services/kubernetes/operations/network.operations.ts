import type * as k8s from "@kubernetes/client-node";
import { BaseK8sOperations } from "./base.operations";

export class NetworkOperations extends BaseK8sOperations {
  constructor(
    private coreApi: k8s.CoreV1Api,
    private networkingApi: k8s.NetworkingV1Api,
    namespace: string
  ) {
    super(namespace);
  }

  async listServices() {
    return this.executeOperation(
      () => this.coreApi.listNamespacedService({ namespace: this.namespace }).then((r) => r.items),
      "Failed to fetch services"
    );
  }

  async listIngresses() {
    return this.executeOperation(
      () =>
        this.networkingApi
          .listNamespacedIngress({ namespace: this.namespace })
          .then((r) => r.items),
      "Failed to fetch ingresses"
    );
  }

  async getServiceInfo(serviceName: string) {
    return this.executeOperation(
      () => this.coreApi.readNamespacedService({ name: serviceName, namespace: this.namespace }),
      `Failed to fetch service info for ${serviceName}`
    );
  }

  async getServerConnectionInfo(serviceName: string) {
    return this.executeOperation(async () => {
      const service = await this.coreApi.readNamespacedService({
        name: serviceName,
        namespace: this.namespace,
      });

      const serviceType = service.spec?.type || "ClusterIP";
      const ports = service.spec?.ports || [];

      let host: string;
      let externalHost: string | undefined;

      switch (serviceType) {
        case "LoadBalancer": {
          const ingress = service.status?.loadBalancer?.ingress?.[0];
          host =
            ingress?.hostname ||
            ingress?.ip ||
            `${serviceName}.${this.namespace}.svc.cluster.local`;
          externalHost = ingress?.hostname || ingress?.ip;
          break;
        }

        case "NodePort":
          host = `${serviceName}.${this.namespace}.svc.cluster.local`;
          externalHost = "<node-ip>";
          break;

        default:
          host = `${serviceName}.${this.namespace}.svc.cluster.local`;
          externalHost = undefined;
      }

      const portMappings = ports.map((port) => ({
        name: port.name,
        port: port.port,
        targetPort: port.targetPort,
        nodePort: port.nodePort,
        protocol: port.protocol || "TCP",
      }));

      return {
        serviceName,
        namespace: this.namespace,
        serviceType,
        internalHost: host,
        externalHost,
        ports: portMappings,
      };
    }, `Failed to fetch connection info for service ${serviceName}`);
  }
}
