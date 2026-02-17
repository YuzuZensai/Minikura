import type * as k8s from "@kubernetes/client-node";
import { BaseK8sOperations } from "./base.operations";

export class ClusterOperations extends BaseK8sOperations {
  constructor(
    private coreApi: k8s.CoreV1Api,
    private customObjectsApi: k8s.CustomObjectsApi,
    namespace: string
  ) {
    super(namespace);
  }

  async listNodes() {
    return this.executeOperation(
      () => this.coreApi.listNode().then((r) => r.items),
      "Failed to fetch nodes"
    );
  }

  async getNodeMetrics() {
    return this.executeOperation(
      () =>
        this.customObjectsApi.listClusterCustomObject({
          group: "metrics.k8s.io",
          version: "v1beta1",
          plural: "nodes",
        }),
      "Failed to fetch node metrics"
    );
  }

  async listConfigMaps(namespace?: string) {
    const ns = namespace || this.namespace;
    return this.executeOperation(
      () => this.coreApi.listNamespacedConfigMap({ namespace: ns }).then((r) => r.items),
      "Failed to fetch configmaps"
    );
  }
}
