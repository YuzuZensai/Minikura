import type * as k8s from "@kubernetes/client-node";
import { BaseK8sOperations } from "./base.operations";

export class WorkloadOperations extends BaseK8sOperations {
  constructor(
    private appsApi: k8s.AppsV1Api,
    namespace: string
  ) {
    super(namespace);
  }

  async listDeployments() {
    return this.executeOperation(
      () =>
        this.appsApi.listNamespacedDeployment({ namespace: this.namespace }).then((r) => r.items),
      "Failed to fetch deployments"
    );
  }

  async listStatefulSets() {
    return this.executeOperation(
      () =>
        this.appsApi.listNamespacedStatefulSet({ namespace: this.namespace }).then((r) => r.items),
      "Failed to fetch statefulsets"
    );
  }
}
