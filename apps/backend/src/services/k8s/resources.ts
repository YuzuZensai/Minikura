import type * as k8s from "@kubernetes/client-node";
import type {
  DeploymentInfo,
  K8sConfigMapSummary,
  K8sIngressSummary,
  K8sNodeSummary,
  K8sServiceInfo,
  K8sServicePort,
  K8sServiceSummary,
  PodDetails,
  PodInfo,
  StatefulSetInfo,
} from "@minikura/api";

export class K8sResources {
  constructor(
    private readonly coreApi: k8s.CoreV1Api,
    private readonly appsApi: k8s.AppsV1Api,
    private readonly networkingApi: k8s.NetworkingV1Api,
    private readonly namespace: string
  ) {}

  async listPods(): Promise<PodInfo[]> {
    const response = await this.coreApi.listNamespacedPod({ namespace: this.namespace });
    return response.items.map((pod) => mapPodInfo(pod));
  }

  async listPodsByLabel(labelSelector: string): Promise<PodInfo[]> {
    const response = await this.coreApi.listNamespacedPod({
      namespace: this.namespace,
      labelSelector,
    });
    return response.items.map((pod) => ({
      ...mapPodInfo(pod),
      containers: pod.spec?.containers?.map((container) => container.name ?? "") || [],
    }));
  }

  async getPodInfo(podName: string): Promise<PodDetails> {
    const response = await this.coreApi.readNamespacedPod({
      name: podName,
      namespace: this.namespace,
    });
    const pod = response;
    return {
      ...mapPodInfo(pod),
      containers: pod.spec?.containers?.map((container) => container.name ?? "") || [],
      ip: pod.status?.podIP,
      conditions:
        pod.status?.conditions?.map((condition) => ({
          type: condition.type,
          status: condition.status,
          lastTransitionTime: condition.lastTransitionTime
            ? condition.lastTransitionTime.toISOString()
            : undefined,
        })) || [],
      containerStatuses:
        pod.status?.containerStatuses?.map((status) => ({
          name: status.name,
          ready: status.ready,
          restartCount: status.restartCount,
          state: status.state
            ? {
                waiting: status.state.waiting
                  ? {
                      reason: status.state.waiting.reason,
                      message: status.state.waiting.message,
                    }
                  : undefined,
                running: status.state.running
                  ? {
                      startedAt: status.state.running.startedAt,
                    }
                  : undefined,
                terminated: status.state.terminated
                  ? {
                      reason: status.state.terminated.reason,
                      exitCode: status.state.terminated.exitCode,
                      finishedAt: status.state.terminated.finishedAt,
                    }
                  : undefined,
              }
            : undefined,
        })) || [],
    };
  }

  async listDeployments(): Promise<DeploymentInfo[]> {
    const response = await this.appsApi.listNamespacedDeployment({ namespace: this.namespace });
    return response.items.map((deployment) => ({
      name: deployment.metadata?.name ?? "",
      namespace: deployment.metadata?.namespace,
      ready: `${deployment.status?.readyReplicas ?? 0}/${deployment.status?.replicas ?? 0}`,
      desired: deployment.status?.replicas ?? 0,
      current: deployment.status?.replicas ?? 0,
      updated: deployment.status?.updatedReplicas ?? 0,
      upToDate: deployment.status?.updatedReplicas ?? 0,
      available: deployment.status?.availableReplicas ?? 0,
      age: getAge(deployment.metadata?.creationTimestamp),
      labels: deployment.metadata?.labels,
    }));
  }

  async listStatefulSets(): Promise<StatefulSetInfo[]> {
    const response = await this.appsApi.listNamespacedStatefulSet({ namespace: this.namespace });
    return response.items.map((statefulSet) => ({
      name: statefulSet.metadata?.name ?? "",
      namespace: statefulSet.metadata?.namespace,
      ready: `${statefulSet.status?.readyReplicas ?? 0}/${statefulSet.spec?.replicas ?? 0}`,
      desired: statefulSet.spec?.replicas ?? 0,
      current: statefulSet.status?.currentReplicas ?? 0,
      updated: statefulSet.status?.updatedReplicas ?? 0,
      age: getAge(statefulSet.metadata?.creationTimestamp),
      labels: statefulSet.metadata?.labels,
    }));
  }

  async listServices(): Promise<K8sServiceSummary[]> {
    const response = await this.coreApi.listNamespacedService({ namespace: this.namespace });
    return response.items.map((service) => {
      const ports = service.spec?.ports ?? [];
      const portSummary = ports
        .map((port) => `${port.port}${port.nodePort ? `:${port.nodePort}` : ""}/${port.protocol}`)
        .join(", ");

      return {
        name: service.metadata?.name ?? "",
        namespace: service.metadata?.namespace,
        type: service.spec?.type,
        clusterIP: service.spec?.clusterIP ?? null,
        externalIP:
          service.status?.loadBalancer?.ingress?.[0]?.ip ||
          service.spec?.externalIPs?.join(", ") ||
          "<none>",
        ports: portSummary,
        age: getAge(service.metadata?.creationTimestamp),
        labels: service.metadata?.labels,
      };
    });
  }

  async listConfigMaps(): Promise<K8sConfigMapSummary[]> {
    const response = await this.coreApi.listNamespacedConfigMap({ namespace: this.namespace });
    return response.items.map((configMap) => ({
      name: configMap.metadata?.name ?? "",
      namespace: configMap.metadata?.namespace,
      data: Object.keys(configMap.data ?? {}).length,
      age: getAge(configMap.metadata?.creationTimestamp),
      labels: configMap.metadata?.labels,
    }));
  }

  async listIngresses(): Promise<K8sIngressSummary[]> {
    const response = await this.networkingApi.listNamespacedIngress({ namespace: this.namespace });
    return response.items.map((ingress) => {
      const hosts =
        ingress.spec?.rules
          ?.map((rule) => rule.host)
          .filter((host): host is string => Boolean(host))
          .join(", ") || "<none>";
      const addresses =
        ingress.status?.loadBalancer?.ingress
          ?.map((item) => item.ip || item.hostname)
          .filter((entry): entry is string => Boolean(entry))
          .join(", ") || "<pending>";

      return {
        name: ingress.metadata?.name ?? "",
        namespace: ingress.metadata?.namespace,
        className: ingress.spec?.ingressClassName ?? null,
        hosts,
        address: addresses,
        age: getAge(ingress.metadata?.creationTimestamp),
        labels: ingress.metadata?.labels,
      };
    });
  }

  async getServiceInfo(serviceName: string): Promise<K8sServiceInfo> {
    const response = await this.coreApi.readNamespacedService({
      name: serviceName,
      namespace: this.namespace,
    });
    const service = response;
    const ports: K8sServicePort[] =
      service.spec?.ports?.map((port) => ({
        name: port.name ?? null,
        protocol: port.protocol ?? null,
        port: port.port,
        targetPort: port.targetPort,
        nodePort: port.nodePort ?? null,
      })) || [];

    return {
      name: service.metadata?.name,
      namespace: service.metadata?.namespace,
      type: service.spec?.type,
      clusterIP: service.spec?.clusterIP ?? null,
      externalIPs: service.spec?.externalIPs || [],
      loadBalancerIP: service.status?.loadBalancer?.ingress?.[0]?.ip || null,
      loadBalancerHostname: service.status?.loadBalancer?.ingress?.[0]?.hostname || null,
      ports,
      selector: service.spec?.selector,
    };
  }

  async listNodes(): Promise<K8sNodeSummary[]> {
    const response = await this.coreApi.listNode();
    return response.items.map((node) => {
      const labels = node.metadata?.labels ?? {};
      const roles = Object.keys(labels)
        .filter((label) => label.startsWith("node-role.kubernetes.io/"))
        .map((label) => label.replace("node-role.kubernetes.io/", ""))
        .join(",");
      const addresses = node.status?.addresses ?? [];
      const internalIP = addresses.find((address) => address.type === "InternalIP")?.address;
      const externalIP = addresses.find((address) => address.type === "ExternalIP")?.address;
      const hostname = addresses.find((address) => address.type === "Hostname")?.address;
      const readyCondition = node.status?.conditions?.find((condition) => condition.type === "Ready");

      return {
        name: node.metadata?.name,
        status: readyCondition?.status === "True" ? "Ready" : "NotReady",
        roles: roles || "<none>",
        age: getAge(node.metadata?.creationTimestamp),
        version: node.status?.nodeInfo?.kubeletVersion,
        internalIP,
        externalIP,
        hostname,
      };
    });
  }
}

function mapPodInfo(pod: k8s.V1Pod): PodInfo {
  const containerStatuses = pod.status?.containerStatuses ?? [];
  const readyCount = containerStatuses.filter((status) => status.ready).length;
  const totalCount = containerStatuses.length;
  const restarts = containerStatuses.reduce(
    (accumulator, status) => accumulator + (status.restartCount ?? 0),
    0
  );

  return {
    name: pod.metadata?.name ?? "",
    namespace: pod.metadata?.namespace,
    status: pod.status?.phase ?? "Unknown",
    ready: `${readyCount}/${totalCount}`,
    restarts,
    age: getAge(pod.metadata?.creationTimestamp),
    labels: pod.metadata?.labels,
    nodeName: pod.spec?.nodeName,
  };
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
