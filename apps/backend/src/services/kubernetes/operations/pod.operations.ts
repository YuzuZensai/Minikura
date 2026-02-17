import type * as k8s from "@kubernetes/client-node";
import { BaseK8sOperations } from "./base.operations";

export class PodOperations extends BaseK8sOperations {
  constructor(
    private coreApi: k8s.CoreV1Api,
    namespace: string
  ) {
    super(namespace);
  }

  async listPods() {
    return this.executeOperation(
      () => this.coreApi.listNamespacedPod({ namespace: this.namespace }).then((r) => r.items),
      "Failed to fetch pods"
    );
  }

  async listPodsByLabel(labelSelector: string) {
    return this.executeOperation(
      () =>
        this.coreApi
          .listNamespacedPod({ namespace: this.namespace, labelSelector })
          .then((r) => r.items),
      "Failed to fetch pods by label"
    );
  }

  async getPodInfo(podName: string) {
    return this.executeOperation(
      () => this.coreApi.readNamespacedPod({ name: podName, namespace: this.namespace }),
      `Failed to fetch pod info for ${podName}`
    );
  }

  async getPodLogs(
    podName: string,
    options?: {
      container?: string;
      tailLines?: number;
      timestamps?: boolean;
      sinceSeconds?: number;
    }
  ): Promise<string> {
    return this.executeOperation(
      () =>
        this.coreApi.readNamespacedPodLog({
          name: podName,
          namespace: this.namespace,
          container: options?.container,
          tailLines: options?.tailLines,
          timestamps: options?.timestamps,
          sinceSeconds: options?.sinceSeconds,
        }),
      `Failed to fetch logs for pod ${podName}`
    );
  }

  async getPodMetrics(customObjectsApi: k8s.CustomObjectsApi, namespace?: string) {
    const ns = namespace || this.namespace;
    return this.executeOperation(
      () =>
        customObjectsApi.listNamespacedCustomObject({
          group: "metrics.k8s.io",
          version: "v1beta1",
          namespace: ns,
          plural: "pods",
        }),
      "Failed to fetch pod metrics"
    );
  }
}
