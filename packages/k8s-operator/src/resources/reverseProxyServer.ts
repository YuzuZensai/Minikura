import type * as k8s from "@kubernetes/client-node";
import type { ReverseProxyServerType } from "@minikura/db";
import { LABEL_PREFIX } from "../config/constants";
import { DEFAULT_PROXY_MEMORY, JAVA_MEMORY_FACTOR } from "../config/resource-defaults";
import type { ReverseProxyConfig } from "../types";
import { logger } from "../utils/logger";
import { calculateJavaMemory, convertToK8sFormat } from "../utils/memory";
import { mapServiceType } from "../utils/service-type";

export async function createReverseProxyServer(
  server: ReverseProxyConfig,
  appsApi: k8s.AppsV1Api,
  coreApi: k8s.CoreV1Api,
  _networkingApi: k8s.NetworkingV1Api,
  namespace: string
): Promise<void> {
  logger.debug(
    { proxyId: server.id, proxyType: server.type, namespace },
    "Creating reverse proxy server"
  );

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
    await coreApi.createNamespacedConfigMap({ namespace, body: configMap });
    logger.debug({ proxyId: server.id, resource: "ConfigMap" }, "Created ConfigMap");
  } catch (error: any) {
    if (error.code === 409) {
      await coreApi.replaceNamespacedConfigMap({
        name: `${serverName}-config`,
        namespace,
        body: configMap,
      });
      logger.debug({ proxyId: server.id, resource: "ConfigMap" }, "Updated ConfigMap");
    } else {
      throw error;
    }
  }

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
      type: mapServiceType(server.service_type, "LoadBalancer"),
    },
  };

  try {
    await coreApi.createNamespacedService({ namespace, body: service });
    logger.debug({ proxyId: server.id, resource: "Service" }, "Created Service");
  } catch (error: any) {
    if (error.code === 409) {
      await coreApi.replaceNamespacedService({ name: serverName, namespace, body: service });
      logger.debug({ proxyId: server.id, resource: "Service" }, "Updated Service");
    } else {
      throw error;
    }
  }

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
                  value: calculateJavaMemory(
                    server.memory || DEFAULT_PROXY_MEMORY,
                    JAVA_MEMORY_FACTOR
                  ),
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
                  memory: convertToK8sFormat(server.memory || DEFAULT_PROXY_MEMORY),
                  cpu: "250m",
                },
                limits: {
                  memory: convertToK8sFormat(server.memory || DEFAULT_PROXY_MEMORY),
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
    await appsApi.createNamespacedDeployment({ namespace, body: deployment });
    logger.debug({ proxyId: server.id, resource: "Deployment" }, "Created Deployment");
  } catch (error: any) {
    if (error.code === 409) {
      await appsApi.replaceNamespacedDeployment({ name: serverName, namespace, body: deployment });
      logger.debug({ proxyId: server.id, resource: "Deployment" }, "Updated Deployment");
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
    await appsApi.deleteNamespacedDeployment({ name, namespace });
    logger.debug({ proxyId, resource: "Deployment" }, "Deleted Deployment");
  } catch (error: any) {
    if (error.response?.statusCode !== 404) {
      logger.error({ err: error, proxyId, resource: "Deployment" }, "Failed to delete Deployment");
    }
  }

  try {
    await coreApi.deleteNamespacedService({ name, namespace });
    logger.debug({ proxyId, resource: "Service" }, "Deleted Service");
  } catch (error: any) {
    if (error.response?.statusCode !== 404) {
      logger.error({ err: error, proxyId, resource: "Service" }, "Failed to delete Service");
    }
  }

  try {
    await coreApi.deleteNamespacedConfigMap({ name: `${name}-config`, namespace });
    logger.debug({ proxyId, resource: "ConfigMap" }, "Deleted ConfigMap");
  } catch (error: any) {
    if (error.response?.statusCode !== 404) {
      logger.error({ err: error, proxyId, resource: "ConfigMap" }, "Failed to delete ConfigMap");
    }
  }
}
