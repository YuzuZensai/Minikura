import type * as k8s from "@kubernetes/client-node";
import { ServerType } from "@minikura/db";
import { LABEL_PREFIX } from "../config/constants";
import { DEFAULT_SERVER_MEMORY, JAVA_MEMORY_FACTOR } from "../config/resource-defaults";
import type { ServerConfig } from "../types";
import { logger } from "../utils/logger";
import { calculateJavaMemory, convertToK8sFormat } from "../utils/memory";
import { mapServiceType } from "../utils/service-type";

export async function createServer(
  server: ServerConfig,
  appsApi: k8s.AppsV1Api,
  coreApi: k8s.CoreV1Api,
  _networkingApi: k8s.NetworkingV1Api,
  namespace: string
): Promise<void> {
  const serverName = `minecraft-${server.id}`;

  const configMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: `${serverName}-config`,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: server.type.toLowerCase(),
        [`${LABEL_PREFIX}/server-id`]: server.id,
      },
    },
    data: {
      "server-type": server.type,
      "minikura-api-key": server.apiKey,
    },
  };

  try {
    await coreApi.createNamespacedConfigMap({ namespace, body: configMap });
    logger.debug({ serverId: server.id, resource: "ConfigMap" }, "Created ConfigMap");
  } catch (err: any) {
    if (err.code === 409) {
      await coreApi.replaceNamespacedConfigMap({
        name: `${serverName}-config`,
        namespace,
        body: configMap,
      });
      logger.debug({ serverId: server.id, resource: "ConfigMap" }, "Updated ConfigMap");
    } else {
      throw err;
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
        [`${LABEL_PREFIX}/server-type`]: server.type.toLowerCase(),
        [`${LABEL_PREFIX}/server-id`]: server.id,
      },
    },
    spec: {
      selector: {
        app: serverName,
      },
      ports: [
        {
          port: server.listen_port,
          targetPort: 25565,
          protocol: "TCP",
          name: "minecraft",
        },
      ],
      type: mapServiceType(server.service_type),
    },
  };

  try {
    await coreApi.createNamespacedService({ namespace, body: service });
    logger.debug(
      { serverId: server.id, resource: "Service", port: server.listen_port },
      "Created Service"
    );
  } catch (err: any) {
    if (err.code === 409) {
      await coreApi.replaceNamespacedService({ name: serverName, namespace, body: service });
      logger.debug({ serverId: server.id, resource: "Service" }, "Updated Service");
    } else {
      throw err;
    }
  }

  if (server.type === ServerType.STATELESS) {
    await createDeployment(serverName, server, appsApi, namespace);
  } else {
    await createStatefulSet(serverName, server, appsApi, namespace);
  }
}

async function createDeployment(
  serverName: string,
  server: ServerConfig,
  appsApi: k8s.AppsV1Api,
  namespace: string
): Promise<void> {
  const deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: serverName,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: "stateless",
        [`${LABEL_PREFIX}/server-id`]: server.id,
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
            [`${LABEL_PREFIX}/server-type`]: "stateless",
            [`${LABEL_PREFIX}/server-id`]: server.id,
          },
        },
        spec: {
          containers: [
            {
              name: "minecraft",
              image: "itzg/minecraft-server",
              ports: [
                {
                  containerPort: 25565,
                  name: "minecraft",
                },
              ],
              env: [
                {
                  name: "EULA",
                  value: "TRUE",
                },
                {
                  name: "TYPE",
                  value: "VANILLA",
                },
                {
                  name: "MEMORY",
                  value: calculateJavaMemory(
                    server.memory || DEFAULT_SERVER_MEMORY,
                    JAVA_MEMORY_FACTOR
                  ),
                },
                {
                  name: "OPS",
                  value: "",
                },
                {
                  name: "OVERRIDE_SERVER_PROPERTIES",
                  value: "true",
                },
                {
                  name: "ENABLE_RCON",
                  value: "false",
                },
                ...(server.env_variables || []).map((ev) => ({
                  name: ev.key,
                  value: ev.value,
                })),
              ],
              volumeMounts: [
                {
                  name: "config",
                  mountPath: "/config",
                },
              ],
              readinessProbe: {
                tcpSocket: {
                  port: 25565,
                },
                initialDelaySeconds: 30,
                periodSeconds: 10,
              },
              resources: {
                requests: {
                  memory: convertToK8sFormat(server.memory || DEFAULT_SERVER_MEMORY),
                  cpu: "250m",
                },
                limits: {
                  memory: convertToK8sFormat(server.memory || DEFAULT_SERVER_MEMORY),
                  cpu: "500m",
                },
              },
            },
          ],
          volumes: [
            {
              name: "config",
              configMap: {
                name: `${serverName}-config`,
              },
            },
          ],
        },
      },
    },
  };

  try {
    await appsApi.createNamespacedDeployment({ namespace, body: deployment });
    logger.debug({ serverId: server.id, resource: "Deployment" }, "Created Deployment");
  } catch (err: any) {
    if (err.code === 409) {
      await appsApi.replaceNamespacedDeployment({ name: serverName, namespace, body: deployment });
      logger.debug({ serverId: server.id, resource: "Deployment" }, "Updated Deployment");
    } else {
      throw err;
    }
  }
}

async function createStatefulSet(
  serverName: string,
  server: ServerConfig,
  appsApi: k8s.AppsV1Api,
  namespace: string
): Promise<void> {
  const statefulSet = {
    apiVersion: "apps/v1",
    kind: "StatefulSet",
    metadata: {
      name: serverName,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: "stateful",
        [`${LABEL_PREFIX}/server-id`]: server.id,
      },
    },
    spec: {
      serviceName: serverName,
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
            [`${LABEL_PREFIX}/server-type`]: "stateful",
            [`${LABEL_PREFIX}/server-id`]: server.id,
          },
        },
        spec: {
          containers: [
            {
              name: "minecraft",
              image: "itzg/minecraft-server",
              ports: [
                {
                  containerPort: 25565,
                  name: "minecraft",
                },
              ],
              env: [
                {
                  name: "EULA",
                  value: "TRUE",
                },
                {
                  name: "TYPE",
                  value: "VANILLA",
                },
                {
                  name: "MEMORY",
                  value: calculateJavaMemory(
                    server.memory || DEFAULT_SERVER_MEMORY,
                    JAVA_MEMORY_FACTOR
                  ),
                },
                {
                  name: "OPS",
                  value: "",
                },
                {
                  name: "OVERRIDE_SERVER_PROPERTIES",
                  value: "true",
                },
                {
                  name: "ENABLE_RCON",
                  value: "false",
                },
                ...(server.env_variables || []).map((ev) => ({
                  name: ev.key,
                  value: ev.value,
                })),
              ],
              volumeMounts: [
                {
                  name: "data",
                  mountPath: "/data",
                },
                {
                  name: "config",
                  mountPath: "/config",
                },
              ],
              readinessProbe: {
                tcpSocket: {
                  port: 25565,
                },
                initialDelaySeconds: 60,
                periodSeconds: 10,
              },
              resources: {
                requests: {
                  memory: convertToK8sFormat(server.memory),
                  cpu: "250m",
                },
                limits: {
                  memory: convertToK8sFormat(server.memory),
                  cpu: "500m",
                },
              },
            },
          ],
          volumes: [
            {
              name: "config",
              configMap: {
                name: `${serverName}-config`,
              },
            },
          ],
        },
      },
      volumeClaimTemplates: [
        {
          metadata: {
            name: "data",
          },
          spec: {
            accessModes: ["ReadWriteOnce"],
            resources: {
              requests: {
                storage: "1Gi",
              },
            },
          },
        },
      ],
    },
  };

  try {
    await appsApi.createNamespacedStatefulSet({ namespace, body: statefulSet });
    logger.debug({ serverId: server.id, resource: "StatefulSet" }, "Created StatefulSet");
  } catch (err: any) {
    if (err.code === 409) {
      await appsApi.replaceNamespacedStatefulSet({
        name: serverName,
        namespace,
        body: statefulSet,
      });
      logger.debug({ serverId: server.id, resource: "StatefulSet" }, "Updated StatefulSet");
    } else {
      throw err;
    }
  }
}

export async function deleteServer(
  serverId: string,
  appsApi: k8s.AppsV1Api,
  coreApi: k8s.CoreV1Api,
  namespace: string
): Promise<void> {
  const serverName = `minecraft-${serverId}`;

  try {
    await appsApi.deleteNamespacedDeployment({ name: serverName, namespace });
    logger.debug({ serverName, resource: "Deployment" }, "Deleted Deployment");
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      logger.error({ err, serverName, resource: "Deployment" }, "Failed to delete Deployment");
    }
  }

  try {
    await appsApi.deleteNamespacedStatefulSet({ name: serverName, namespace });
    logger.debug({ serverName, resource: "StatefulSet" }, "Deleted StatefulSet");
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      logger.error({ err, serverName, resource: "StatefulSet" }, "Failed to delete StatefulSet");
    }
  }

  try {
    await coreApi.deleteNamespacedService({ name: serverName, namespace });
    logger.debug({ serverName, resource: "Service" }, "Deleted Service");
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      logger.error({ err, serverName, resource: "Service" }, "Failed to delete Service");
    }
  }

  try {
    await coreApi.deleteNamespacedConfigMap({ name: `${serverName}-config`, namespace });
    logger.debug({ serverName, resource: "ConfigMap" }, "Deleted ConfigMap");
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      logger.error({ err, serverName, resource: "ConfigMap" }, "Failed to delete ConfigMap");
    }
  }
}
