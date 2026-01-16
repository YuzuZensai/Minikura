import type * as k8s from "@kubernetes/client-node";
import type { ReverseProxyServerType } from "@minikura/db";
import { LABEL_PREFIX } from "../config/constants";
import { calculateJavaMemory, convertToK8sFormat } from "../utils/memory";
import type { ReverseProxyConfig } from "../types";

export async function createReverseProxyServer(
  server: ReverseProxyConfig,
  appsApi: k8s.AppsV1Api,
  coreApi: k8s.CoreV1Api,
  networkingApi: k8s.NetworkingV1Api,
  namespace: string
): Promise<void> {
  console.log(`Creating reverse proxy server ${server.id} in namespace '${namespace}'`);

  const serverType = server.type.toLowerCase();
  const serverName = `${serverType}-${server.id}`;

  const configMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: `${serverName}-config`,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: serverType,
        [`${LABEL_PREFIX}/proxy-id`]: server.id,
      },
    },
    data: {
      "minikura-api-key": server.apiKey,
    },
  };

  try {
    await coreApi.createNamespacedConfigMap(namespace, configMap);
    console.log(`Created ConfigMap for reverse proxy server ${server.id}`);
  } catch (error: any) {
    // Conflict, update it
    if (error.response?.statusCode === 409) {
      await coreApi.replaceNamespacedConfigMap(`${serverName}-config`, namespace, configMap);
      console.log(`Updated ConfigMap for reverse proxy server ${server.id}`);
    } else {
      throw error;
    }
  }

  // Create Service for the reverse proxy - Always LoadBalancer for now
  const service = {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: serverName,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: serverType,
        [`${LABEL_PREFIX}/proxy-id`]: server.id,
      },
    },
    spec: {
      selector: {
        app: serverName,
      },
      ports: [
        {
          port: server.external_port,
          targetPort: server.listen_port,
          protocol: "TCP",
          name: "minecraft",
        },
      ],
      type: "LoadBalancer",
    },
  };

  try {
    await coreApi.createNamespacedService(namespace, service);
    console.log(`Created Service for reverse proxy server ${server.id}`);
  } catch (error: any) {
    // Conflict, update it
    if (error.response?.statusCode === 409) {
      await coreApi.replaceNamespacedService(serverName, namespace, service);
      console.log(`Updated Service for reverse proxy server ${server.id}`);
    } else {
      throw error;
    }
  }

  // Create Deployment
  const deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: serverName,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: serverType,
        [`${LABEL_PREFIX}/proxy-id`]: server.id,
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: serverName,
        },
      },
      template: {
        metadata: {
          labels: {
            app: serverName,
            [`${LABEL_PREFIX}/server-type`]: serverType,
            [`${LABEL_PREFIX}/proxy-id`]: server.id,
          },
        },
        spec: {
          containers: [
            {
              name: serverType,
              image: "itzg/mc-proxy:latest",
              ports: [
                {
                  containerPort: server.listen_port,
                  name: "minecraft",
                },
              ],
              env: [
                {
                  name: "TYPE",
                  value: server.type,
                },
                {
                  name: "NETWORKADDRESS_CACHE_TTL",
                  value: "30",
                },
                {
                  name: "MEMORY",
                  value: calculateJavaMemory(server.memory || "512M", 0.8),
                },
                ...(server.env_variables || []).map((ev) => ({
                  name: ev.key,
                  value: ev.value,
                })),
              ],
              readinessProbe: {
                tcpSocket: {
                  port: server.listen_port,
                },
                initialDelaySeconds: 30,
                periodSeconds: 10,
              },
              resources: {
                requests: {
                  memory: convertToK8sFormat(server.memory || "512M"),
                  cpu: "250m",
                },
                limits: {
                  memory: convertToK8sFormat(server.memory || "512M"),
                  cpu: "500m",
                },
              },
            },
          ],
        },
      },
    },
  };

  try {
    await appsApi.createNamespacedDeployment(namespace, deployment);
    console.log(`Created Deployment for reverse proxy server ${server.id}`);
  } catch (error: any) {
    // Conflict, update it
    if (error.response?.statusCode === 409) {
      await appsApi.replaceNamespacedDeployment(serverName, namespace, deployment);
      console.log(`Updated Deployment for reverse proxy server ${server.id}`);
    } else {
      throw error;
    }
  }
}

export async function deleteReverseProxyServer(
  proxyId: string,
  proxyType: ReverseProxyServerType,
  appsApi: k8s.AppsV1Api,
  coreApi: k8s.CoreV1Api,
  namespace: string
): Promise<void> {
  const serverType = proxyType.toLowerCase();
  const name = `${serverType}-${proxyId}`;

  try {
    await appsApi.deleteNamespacedDeployment(name, namespace);
    console.log(`Deleted Deployment for reverse proxy server ${proxyId}`);
  } catch (error: any) {
    if (error.response?.statusCode !== 404) {
      console.error(`Error deleting Deployment for reverse proxy server ${proxyId}:`, error);
    }
  }

  try {
    await coreApi.deleteNamespacedService(name, namespace);
    console.log(`Deleted Service for reverse proxy server ${proxyId}`);
  } catch (error: any) {
    if (error.response?.statusCode !== 404) {
      console.error(`Error deleting Service for reverse proxy server ${proxyId}:`, error);
    }
  }

  try {
    await coreApi.deleteNamespacedConfigMap(`${name}-config`, namespace);
    console.log(`Deleted ConfigMap for reverse proxy server ${proxyId}`);
  } catch (error: any) {
    if (error.response?.statusCode !== 404) {
      console.error(`Error deleting ConfigMap for reverse proxy server ${proxyId}:`, error);
    }
  }
}
