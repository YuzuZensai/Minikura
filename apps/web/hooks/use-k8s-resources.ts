"use client";

import type {
  CustomResourceSummary,
  DeploymentInfo,
  K8sConfigMapSummary,
  K8sServiceSummary,
  K8sStatus,
  StatefulSetInfo,
} from "@minikura/api";
import { LABEL_PREFIX } from "@minikura/api";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useK8sResources() {
  const [statefulSets, setStatefulSets] = useState<StatefulSetInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [services, setServices] = useState<K8sServiceSummary[]>([]);
  const [configMaps, setConfigMaps] = useState<K8sConfigMapSummary[]>([]);
  const [minecraftServers, setMinecraftServers] = useState<CustomResourceSummary[]>([]);
  const [reverseProxyServers, setReverseProxyServers] = useState<CustomResourceSummary[]>([]);
  const [status, setStatus] = useState<K8sStatus>({ initialized: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [
        statusRes,
        podsRes,
        deploymentsRes,
        statefulSetsRes,
        servicesRes,
        configMapsRes,
        minecraftServersRes,
        reverseProxyServersRes,
      ] = await Promise.allSettled([
        api.api.k8s.status.get(),
        api.api.k8s.pods.get(),
        api.api.k8s.deployments.get(),
        api.api.k8s.statefulsets.get(),
        api.api.k8s.services.get(),
        api.api.k8s.configmaps.get(),
        api.api.k8s["minecraft-servers"].get(),
        api.api.k8s["reverse-proxy-servers"].get(),
      ]);

      if (statefulSetsRes.status === "fulfilled" && statefulSetsRes.value.data) {
        setStatefulSets(statefulSetsRes.value.data as StatefulSetInfo[]);
      } else if (statefulSetsRes.status === "rejected") {
        console.error("Failed to fetch statefulsets:", statefulSetsRes.reason);
      }

      if (deploymentsRes.status === "fulfilled" && deploymentsRes.value.data) {
        setDeployments(deploymentsRes.value.data as DeploymentInfo[]);
      } else if (deploymentsRes.status === "rejected") {
        console.error("Failed to fetch deployments:", deploymentsRes.reason);
      }

      if (servicesRes.status === "fulfilled" && servicesRes.value.data) {
        setServices(servicesRes.value.data as K8sServiceSummary[]);
      } else if (servicesRes.status === "rejected") {
        console.error("Failed to fetch services:", servicesRes.reason);
      }

      if (configMapsRes.status === "fulfilled" && configMapsRes.value.data) {
        setConfigMaps(configMapsRes.value.data as K8sConfigMapSummary[]);
      } else if (configMapsRes.status === "rejected") {
        console.error("Failed to fetch configmaps:", configMapsRes.reason);
      }

      if (minecraftServersRes.status === "fulfilled" && minecraftServersRes.value.data) {
        setMinecraftServers(minecraftServersRes.value.data as CustomResourceSummary[]);
      } else if (minecraftServersRes.status === "rejected") {
        console.error("Failed to fetch minecraft servers:", minecraftServersRes.reason);
      }

      if (reverseProxyServersRes.status === "fulfilled" && reverseProxyServersRes.value.data) {
        setReverseProxyServers(reverseProxyServersRes.value.data as CustomResourceSummary[]);
      } else if (reverseProxyServersRes.status === "rejected") {
        console.error("Failed to fetch reverse proxy servers:", reverseProxyServersRes.reason);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch Kubernetes resources";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchData intentionally omitted to avoid infinite loop
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    statefulSets,
    deployments,
    services,
    configMaps,
    minecraftServers,
    reverseProxyServers,
    status,
    loading,
    error,
    refresh: fetchData,
    labelPrefix: LABEL_PREFIX,
  };
}
