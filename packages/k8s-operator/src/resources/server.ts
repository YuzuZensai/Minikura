import * as k8s from '@kubernetes/client-node';
import { ServerType } from '@minikura/db';
import { LABEL_PREFIX } from '../config/constants';
import { calculateJavaMemory, convertToK8sFormat } from '../utils/memory';
import type { ServerConfig } from '../types';

export async function createServer(
  server: ServerConfig,
  appsApi: k8s.AppsV1Api,
  coreApi: k8s.CoreV1Api,
  networkingApi: k8s.NetworkingV1Api,
  namespace: string
): Promise<void> {
  const serverName = `minecraft-${server.id}`;

  const configMap = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: `${serverName}-config`,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: server.type.toLowerCase(),
        [`${LABEL_PREFIX}/server-id`]: server.id,
      }
    },
    data: {
      'server-type': server.type,
      'minikura-api-key': server.apiKey,
    }
  };
  
  try {
    await coreApi.createNamespacedConfigMap(namespace, configMap);
    console.log(`Created ConfigMap for server ${server.id}`);
  } catch (err: any) {
    // Conflict, update it
    if (err.response?.statusCode === 409) {
      await coreApi.replaceNamespacedConfigMap(`${serverName}-config`, namespace, configMap);
      console.log(`Updated ConfigMap for server ${server.id}`);
    } else {
      throw err;
    }
  }

  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: serverName,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: server.type.toLowerCase(),
        [`${LABEL_PREFIX}/server-id`]: server.id,
      }
    },
    spec: {
      selector: {
        app: serverName,
      },
      ports: [
        {
          port: server.listen_port,
          targetPort: 25565,
          protocol: 'TCP',
          name: 'minecraft',
        }
      ],
      type: 'ClusterIP', // Always ClusterIP for regular servers
    }
  };
  
  try {
    await coreApi.createNamespacedService(namespace, service);
    console.log(`Created Service for server ${server.id}`);
  } catch (err: any) {
    // Conflict, update it
    if (err.response?.statusCode === 409) {
      await coreApi.replaceNamespacedService(serverName, namespace, service);
      console.log(`Updated Service for server ${server.id}`);
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
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: serverName,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: 'stateless',
        [`${LABEL_PREFIX}/server-id`]: server.id,
      }
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: serverName,
        }
      },
      template: {
        metadata: {
          labels: {
            app: serverName,
            [`${LABEL_PREFIX}/server-type`]: 'stateless',
            [`${LABEL_PREFIX}/server-id`]: server.id,
          }
        },
        spec: {
          containers: [
            {
              name: 'minecraft',
              image: 'itzg/minecraft-server',
              ports: [
                {
                  containerPort: 25565,
                  name: 'minecraft',
                }
              ],
              env: [
                {
                  name: 'EULA',
                  value: 'TRUE',
                },
                {
                  name: 'TYPE',
                  value: 'VANILLA',
                },
                {
                  name: 'MEMORY',
                  value: calculateJavaMemory(server.memory || '1G', 0.8),
                },
                {
                  name: 'OPS',
                  value: '',
                },
                {
                  name: 'OVERRIDE_SERVER_PROPERTIES',
                  value: 'true',
                },
                {
                  name: 'ENABLE_RCON',
                  value: 'false',
                },
                ...(server.env_variables || []).map(ev => ({
                  name: ev.key,
                  value: ev.value,
                })),
              ],
              volumeMounts: [
                {
                  name: 'config',
                  mountPath: '/config',
                }
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
                  memory: convertToK8sFormat(server.memory || "1G"),
                  cpu: "250m",
                },
                limits: {
                  memory: convertToK8sFormat(server.memory || "1G"),
                  cpu: "500m",
                }
              }
            }
          ],
          volumes: [
            {
              name: 'config',
              configMap: {
                name: `${serverName}-config`,
              }
            }
          ]
        }
      }
    }
  };
  
  try {
    await appsApi.createNamespacedDeployment(namespace, deployment);
    console.log(`Created Deployment for server ${server.id}`);
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      // Deployment already exists, update it
      await appsApi.replaceNamespacedDeployment(serverName, namespace, deployment);
      console.log(`Updated Deployment for server ${server.id}`);
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
    apiVersion: 'apps/v1',
    kind: 'StatefulSet',
    metadata: {
      name: serverName,
      namespace: namespace,
      labels: {
        app: serverName,
        [`${LABEL_PREFIX}/server-type`]: 'stateful',
        [`${LABEL_PREFIX}/server-id`]: server.id,
      }
    },
    spec: {
      serviceName: serverName,
      replicas: 1,
      selector: {
        matchLabels: {
          app: serverName,
        }
      },
      template: {
        metadata: {
          labels: {
            app: serverName,
            [`${LABEL_PREFIX}/server-type`]: 'stateful',
            [`${LABEL_PREFIX}/server-id`]: server.id,
          }
        },
        spec: {
          containers: [
            {
              name: 'minecraft',
              image: 'itzg/minecraft-server',
              ports: [
                {
                  containerPort: 25565,
                  name: 'minecraft',
                }
              ],
              env: [
                {
                  name: 'EULA',
                  value: 'TRUE',
                },
                {
                  name: 'TYPE',
                  value: 'VANILLA',
                },
                {
                  name: 'MEMORY',
                  value: calculateJavaMemory(server.memory || '1G', 0.8),
                },
                {
                  name: 'OPS',
                  value: '',
                },
                {
                  name: 'OVERRIDE_SERVER_PROPERTIES',
                  value: 'true',
                },
                {
                  name: 'ENABLE_RCON',
                  value: 'false',
                },
                ...(server.env_variables || []).map(ev => ({
                  name: ev.key,
                  value: ev.value,
                })),
              ],
              volumeMounts: [
                {
                  name: 'data',
                  mountPath: '/data',
                },
                {
                  name: 'config',
                  mountPath: '/config',
                }
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
                }
              }
            }
          ],
          volumes: [
            {
              name: 'config',
              configMap: {
                name: `${serverName}-config`,
              }
            }
          ]
        }
      },
      volumeClaimTemplates: [
        {
          metadata: {
            name: 'data',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '1Gi',
              }
            }
          }
        }
      ]
    }
  };
  
  try {
    await appsApi.createNamespacedStatefulSet(namespace, statefulSet);
    console.log(`Created StatefulSet for server ${server.id}`);
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      // StatefulSet already exists, update it
      await appsApi.replaceNamespacedStatefulSet(serverName, namespace, statefulSet);
      console.log(`Updated StatefulSet for server ${server.id}`);
    } else {
      throw err;
    }
  }
}

export async function deleteServer(
  serverId: string,
  serverId2: string,
  appsApi: k8s.AppsV1Api,
  coreApi: k8s.CoreV1Api,
  namespace: string
): Promise<void> {
  const serverName = `minecraft-${serverId2}`;
  
  try {
    await appsApi.deleteNamespacedDeployment(serverName, namespace);
    console.log(`Deleted Deployment for server ${serverName}`);
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      console.error(`Error deleting Deployment for server ${serverName}:`, err);
    }
  }
  
  try {
    await appsApi.deleteNamespacedStatefulSet(serverName, namespace);
    console.log(`Deleted StatefulSet for server ${serverName}`);
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      console.error(`Error deleting StatefulSet for server ${serverName}:`, err);
    }
  }
  
  try {
    await coreApi.deleteNamespacedService(serverName, namespace);
    console.log(`Deleted Service for server ${serverName}`);
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      console.error(`Error deleting Service for server ${serverName}:`, err);
    }
  }
  
  try {
    await coreApi.deleteNamespacedConfigMap(`${serverName}-config`, namespace);
    console.log(`Deleted ConfigMap for server ${serverName}`);
  } catch (err: any) {
    if (err.response?.statusCode !== 404) {
      console.error(`Error deleting ConfigMap for server ${serverName}:`, err);
    }
  }
} 