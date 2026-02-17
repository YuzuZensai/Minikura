"use client";

import type { ConnectionInfo, DeploymentInfo, PodInfo, StatefulSetInfo } from "@minikura/api";
import { labelKeys } from "@minikura/api";
import { useCallback, useState } from "react";
import { api } from "@/lib/api-client";

export function useServerLogs(serverId: string) {
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [statefulSetInfo, setStatefulSetInfo] = useState<StatefulSetInfo | null>(null);
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPods = useCallback(async () => {
    try {
      const response = await api.api.k8s.pods.get();
      if (response.data) {
        setPods(response.data as PodInfo[]);
      }
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatefulSetInfo = useCallback(async () => {
    try {
      const response = await api.api.k8s.statefulsets.get();
      if (response.data) {
        const statefulSets = response.data as StatefulSetInfo[];
        const serverStatefulSet = statefulSets.find(
          (s) => s.labels?.[labelKeys.serverId] === serverId
        );
        if (serverStatefulSet) {
          setStatefulSetInfo(serverStatefulSet);
        }
      }
    } catch (_error) {}
  }, [serverId]);

  const fetchDeploymentInfo = useCallback(async () => {
    try {
      const response = await api.api.k8s.deployments.get();
      if (response.data) {
        const deployments = response.data as DeploymentInfo[];
        const serverDeployment = deployments.find(
          (d) => d.labels?.[labelKeys.serverId] === serverId
        );
        if (serverDeployment) {
          setDeploymentInfo(serverDeployment);
        }
      }
    } catch (_error) {}
  }, [serverId]);

  const fetchConnectionInfo = useCallback(async () => {
    try {
      const response = await api.api.servers({ id: serverId })["connection-info"].get();
      if (response.data) {
        setConnectionInfo(response.data as ConnectionInfo);
      }
    } catch (_error) {}
  }, [serverId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchPods(),
      fetchStatefulSetInfo(),
      fetchDeploymentInfo(),
      fetchConnectionInfo(),
    ]);
  }, [fetchPods, fetchStatefulSetInfo, fetchDeploymentInfo, fetchConnectionInfo]);

  return {
    pods,
    statefulSetInfo,
    deploymentInfo,
    connectionInfo,
    loading,
    refresh: refreshAll,
  };
}
