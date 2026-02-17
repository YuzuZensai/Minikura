import type * as k8s from "@kubernetes/client-node";
import type { PrismaClient } from "@minikura/db";
import { API_GROUP, API_VERSION, LABEL_PREFIX } from "../config/constants";
import { REVERSE_PROXY_SERVER_CRD } from "../crds/reverseProxy";
import { MINECRAFT_SERVER_CRD } from "../crds/server";
import type { CustomResourceListResponse, CustomResourceResponse } from "../types/k8s-types";
import { isK8sApiError } from "../types/k8s-types";
import type { KubernetesClient } from "./k8s-client";
import { logger } from "./logger";

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 10000,
    operationName = "operation",
  } = options;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error as Error;

      const is429 = isK8sApiError(error) && error.code === 429;
      const isStorageInitializing =
        isK8sApiError(error) && error.body?.includes("storage is (re)initializing");

      if (!is429 && !isStorageInitializing) {
        throw error;
      }

      if (attempt === maxRetries) {
        logger.error({ operationName, maxRetries }, "Operation failed after max retries");
        throw error;
      }

      let delay = initialDelay * 2 ** attempt;
      if (isK8sApiError(error) && error.headers?.["retry-after"]) {
        const retryAfter = parseInt(error.headers["retry-after"], 10);
        if (!Number.isNaN(retryAfter)) {
          delay = retryAfter * 1000;
        }
      }
      delay = Math.min(delay, maxDelay);

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        {
          operationName,
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          delayMs: delay,
          errorMessage,
        },
        "Operation failed, retrying with backoff"
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function setupCRDRegistration(
  prisma: PrismaClient,
  k8sClient: KubernetesClient,
  namespace: string
): Promise<void> {
  await registerCRDs(k8sClient);

  logger.info("Waiting for Kubernetes storage to stabilize after CRD registration");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await startCRDReflector(prisma, k8sClient, namespace);
}

async function registerCRDs(k8sClient: KubernetesClient): Promise<void> {
  try {
    const apiExtensionsClient = k8sClient.getApiExtensionsApi();

    logger.info(
      { apiGroup: API_GROUP, apiVersion: API_VERSION },
      "Registering Custom Resource Definitions"
    );

    try {
      await apiExtensionsClient.createCustomResourceDefinition({ body: MINECRAFT_SERVER_CRD });
      logger.info(
        { crd: "MinecraftServer", apiGroup: API_GROUP, apiVersion: API_VERSION },
        "CRD created successfully"
      );
    } catch (error: any) {
      if (error.code === 409) {
        logger.debug("MinecraftServer CRD already exists, skipping creation");
      } else {
        logger.error({ err: error }, "Failed to create MinecraftServer CRD");
        throw error;
      }
    }

    try {
      await apiExtensionsClient.createCustomResourceDefinition({ body: REVERSE_PROXY_SERVER_CRD });
      logger.info(
        { crd: "ReverseProxyServer", apiGroup: API_GROUP, apiVersion: API_VERSION },
        "CRD created successfully"
      );
    } catch (error: any) {
      if (error.code === 409) {
        logger.debug("ReverseProxyServer CRD already exists, skipping creation");
      } else {
        logger.error({ err: error }, "Failed to create ReverseProxyServer CRD");
        throw error;
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to register CRDs");
    throw error;
  }
}

async function startCRDReflector(
  prisma: PrismaClient,
  k8sClient: KubernetesClient,
  namespace: string
): Promise<void> {
  const customObjectsApi = k8sClient.getCustomObjectsApi();

  const reflectedMinecraftServers = new Map<string, string>();
  const reflectedReverseProxyServers = new Map<string, string>();

  logger.info("Starting CRD reflector to sync database state to custom resources");

  await syncDBtoCRDs(
    prisma,
    customObjectsApi,
    namespace,
    reflectedMinecraftServers,
    reflectedReverseProxyServers
  );

  setInterval(async () => {
    await syncDBtoCRDs(
      prisma,
      customObjectsApi,
      namespace,
      reflectedMinecraftServers,
      reflectedReverseProxyServers
    );
  }, 30 * 1000);
}

async function syncDBtoCRDs(
  prisma: PrismaClient,
  customObjectsApi: k8s.CustomObjectsApi,
  namespace: string,
  reflectedMinecraftServers: Map<string, string>,
  reflectedReverseProxyServers: Map<string, string>
): Promise<void> {
  try {
    logger.debug("Starting CRD sync operation");
    await syncMinecraftServers(prisma, customObjectsApi, namespace, reflectedMinecraftServers);
    await syncReverseProxyServers(
      prisma,
      customObjectsApi,
      namespace,
      reflectedReverseProxyServers
    );
    logger.debug("CRD sync operation completed successfully");
  } catch (error) {
    logger.error({ err: error }, "Failed to sync database to CRDs");
  }
}

async function syncMinecraftServers(
  prisma: PrismaClient,
  customObjectsApi: k8s.CustomObjectsApi,
  namespace: string,
  reflectedMinecraftServers: Map<string, string>
): Promise<void> {
  try {
    const servers = await prisma.server.findMany();

    let existingCRs: any[] = [];
    try {
      const response = await retryWithBackoff(
        () =>
          customObjectsApi.listNamespacedCustomObject({
            group: API_GROUP,
            version: API_VERSION,
            namespace,
            plural: "minecraftservers",
          }),
        {
          maxRetries: 5,
          initialDelay: 1000,
          operationName: "List MinecraftServer CRs",
        }
      );
      const listResponse = response as unknown as CustomResourceListResponse;
      existingCRs = listResponse.body?.items || listResponse.items || [];
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to list MinecraftServer custom resources, assuming none exist"
      );
      existingCRs = [];
    }

    const existingCRMap = new Map<string, string>();
    const crResourceVersions = new Map<string, string>();

    for (const cr of existingCRs) {
      const internalId = cr.status?.internalId;
      if (internalId) {
        existingCRMap.set(internalId, cr.metadata.name);
        if (cr.metadata?.resourceVersion) {
          crResourceVersions.set(cr.metadata.name, cr.metadata.resourceVersion);
        }
      }
    }

    reflectedMinecraftServers.clear();

    for (const server of servers) {
      const crName = existingCRMap.get(server.id) || `${server.id.toLowerCase()}`;

      const serverCR: {
        apiVersion: string;
        kind: string;
        metadata: {
          name: string;
          namespace: string;
          annotations: Record<string, string>;
          resourceVersion?: string;
        };
        spec: any;
        status: any;
      } = {
        apiVersion: `${API_GROUP}/${API_VERSION}`,
        kind: "MinecraftServer",
        metadata: {
          name: crName,
          namespace: namespace,
          annotations: {
            [`${LABEL_PREFIX}/database-managed`]: "true",
            [`${LABEL_PREFIX}/last-synced`]: new Date().toISOString(),
          },
        },
        spec: {
          id: server.id,
          description: server.description,
          listen_port: server.listen_port,
          type: server.type,
          memory: `${server.memory}M`,
        },
        status: {
          phase: "Running",
          message: "Managed by database",
          internalId: server.id,
          apiKey: "[REDACTED]",
          lastSyncedAt: new Date().toISOString(),
        },
      };

      try {
        const existingCRName = existingCRMap.get(server.id);
        if (existingCRName) {
          try {
            const existingResource = await customObjectsApi.getNamespacedCustomObject({
              group: API_GROUP,
              version: API_VERSION,
              namespace,
              plural: "minecraftservers",
              name: existingCRName,
            });

            const resourceResponse = existingResource as CustomResourceResponse;
            const resource = resourceResponse.body || resourceResponse;
            if (resource?.metadata?.resourceVersion) {
              serverCR.metadata.resourceVersion = resource.metadata.resourceVersion;
            }

            await customObjectsApi.replaceNamespacedCustomObject({
              group: API_GROUP,
              version: API_VERSION,
              namespace,
              plural: "minecraftservers",
              name: existingCRName,
              body: serverCR,
            });
            logger.debug(
              { crName: existingCRName, serverId: server.id },
              "Updated MinecraftServer custom resource"
            );
          } catch (error) {
            logger.error(
              { err: error, serverId: server.id },
              "Failed to get/update MinecraftServer custom resource"
            );
          }
        } else {
          try {
            await customObjectsApi.createNamespacedCustomObject({
              group: API_GROUP,
              version: API_VERSION,
              namespace,
              plural: "minecraftservers",
              body: serverCR,
            });
            logger.debug(
              { crName, serverId: server.id },
              "Created MinecraftServer custom resource"
            );
          } catch (createError: any) {
            if (createError.code === 409) {
              logger.debug({ crName }, "MinecraftServer CR already exists, updating instead");
              try {
                const existingResource = await customObjectsApi.getNamespacedCustomObject({
                  group: API_GROUP,
                  version: API_VERSION,
                  namespace,
                  plural: "minecraftservers",
                  name: crName,
                });

                const resourceResponse = existingResource as CustomResourceResponse;
                let resource = resourceResponse.body || resourceResponse;
                if (!resource?.metadata && resourceResponse.metadata) {
                  resource = resourceResponse;
                }

                if (resource?.metadata?.resourceVersion) {
                  serverCR.metadata.resourceVersion = resource.metadata.resourceVersion;

                  await customObjectsApi.replaceNamespacedCustomObject({
                    group: API_GROUP,
                    version: API_VERSION,
                    namespace,
                    plural: "minecraftservers",
                    name: crName,
                    body: serverCR,
                  });
                  logger.debug(
                    { crName, serverId: server.id },
                    "Updated existing MinecraftServer custom resource"
                  );
                } else {
                  logger.error({ crName }, "Cannot update CR: no resourceVersion in response");
                }
              } catch (updateError) {
                logger.error(
                  { err: updateError, crName },
                  "Failed to update MinecraftServer custom resource"
                );
                throw updateError;
              }
            } else {
              throw createError;
            }
          }
        }

        reflectedMinecraftServers.set(server.id, crName);
      } catch (error) {
        logger.error(
          { err: error, serverId: server.id },
          "Failed to create/update MinecraftServer custom resource"
        );
      }
    }

    for (const [dbId, crName] of existingCRMap.entries()) {
      if (!servers.some((s) => s.id === dbId)) {
        try {
          await customObjectsApi.deleteNamespacedCustomObject({
            group: API_GROUP,
            version: API_VERSION,
            namespace,
            plural: "minecraftservers",
            name: crName,
          });
          logger.info(
            { crName, serverId: dbId },
            "Deleted MinecraftServer CR for removed database record"
          );
        } catch (error) {
          logger.error({ err: error, crName }, "Failed to delete MinecraftServer custom resource");
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to sync Minecraft servers to custom resources");
  }
}

async function syncReverseProxyServers(
  prisma: PrismaClient,
  customObjectsApi: any,
  namespace: string,
  reflectedReverseProxyServers: Map<string, string>
): Promise<void> {
  try {
    const proxies = await prisma.reverseProxyServer.findMany({
      include: {
        env_variables: true,
      },
    });

    let existingCRs: any[] = [];
    try {
      const response = await retryWithBackoff(
        () =>
          customObjectsApi.listNamespacedCustomObject({
            group: API_GROUP,
            version: API_VERSION,
            namespace,
            plural: "reverseproxyservers",
          }),
        {
          maxRetries: 5,
          initialDelay: 1000,
          operationName: "List ReverseProxyServer CRs",
        }
      );
      const listResponse = response as unknown as CustomResourceListResponse;
      existingCRs = listResponse.body?.items || listResponse.items || [];
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to list ReverseProxyServer custom resources, assuming none exist"
      );
      existingCRs = [];
    }

    const existingCRMap = new Map<string, string>();
    const crResourceVersions = new Map<string, string>();

    for (const cr of existingCRs) {
      const internalId = cr.status?.internalId;
      if (internalId) {
        existingCRMap.set(internalId, cr.metadata.name);
        if (cr.metadata?.resourceVersion) {
          crResourceVersions.set(cr.metadata.name, cr.metadata.resourceVersion);
        }
      }
    }

    reflectedReverseProxyServers.clear();

    for (const proxy of proxies) {
      const crName = existingCRMap.get(proxy.id) || `${proxy.id.toLowerCase()}`;

      const proxyCR: {
        apiVersion: string;
        kind: string;
        metadata: {
          name: string;
          namespace: string;
          annotations: Record<string, string>;
          resourceVersion?: string;
        };
        spec: any;
        status: any;
      } = {
        apiVersion: `${API_GROUP}/${API_VERSION}`,
        kind: "ReverseProxyServer",
        metadata: {
          name: crName,
          namespace: namespace,
          annotations: {
            [`${LABEL_PREFIX}/database-managed`]: "true",
            [`${LABEL_PREFIX}/last-synced`]: new Date().toISOString(),
          },
        },
        spec: {
          id: proxy.id,
          description: proxy.description,
          external_address: proxy.external_address,
          external_port: proxy.external_port,
          listen_port: proxy.listen_port,
          type: proxy.type,
          memory: `${proxy.memory}M`,
          environmentVariables: proxy.env_variables?.map((ev) => ({
            key: ev.key,
            value: ev.value,
          })),
        },
        status: {
          phase: "Running",
          message: "Managed by database",
          internalId: proxy.id,
          apiKey: "[REDACTED]",
          lastSyncedAt: new Date().toISOString(),
        },
      };

      try {
        const existingCRName = existingCRMap.get(proxy.id);
        if (existingCRName) {
          try {
            const existingResource = await customObjectsApi.getNamespacedCustomObject({
              group: API_GROUP,
              version: API_VERSION,
              namespace,
              plural: "reverseproxyservers",
              name: existingCRName,
            });

            const resourceResponse = existingResource as CustomResourceResponse;
            const resource = resourceResponse.body || resourceResponse;
            if (resource?.metadata?.resourceVersion) {
              proxyCR.metadata.resourceVersion = resource.metadata.resourceVersion;
            }

            await customObjectsApi.replaceNamespacedCustomObject({
              group: API_GROUP,
              version: API_VERSION,
              namespace,
              plural: "reverseproxyservers",
              name: existingCRName,
              body: proxyCR,
            });
            logger.debug(
              { crName: existingCRName, proxyId: proxy.id },
              "Updated ReverseProxyServer custom resource"
            );
          } catch (error) {
            logger.error(
              { err: error, proxyId: proxy.id },
              "Failed to get/update ReverseProxyServer custom resource"
            );
          }
        } else {
          try {
            await customObjectsApi.createNamespacedCustomObject({
              group: API_GROUP,
              version: API_VERSION,
              namespace,
              plural: "reverseproxyservers",
              body: proxyCR,
            });
            logger.debug(
              { crName, proxyId: proxy.id },
              "Created ReverseProxyServer custom resource"
            );
          } catch (createError: any) {
            if (createError.code === 409) {
              logger.debug({ crName }, "ReverseProxyServer CR already exists, updating instead");
              try {
                const existingResource = await customObjectsApi.getNamespacedCustomObject({
                  group: API_GROUP,
                  version: API_VERSION,
                  namespace,
                  plural: "reverseproxyservers",
                  name: crName,
                });

                const resource = existingResource.body as any;
                if (resource?.metadata?.resourceVersion) {
                  proxyCR.metadata.resourceVersion = resource.metadata.resourceVersion;
                }

                await customObjectsApi.replaceNamespacedCustomObject({
                  group: API_GROUP,
                  version: API_VERSION,
                  namespace,
                  plural: "reverseproxyservers",
                  name: crName,
                  body: proxyCR,
                });
                logger.debug(
                  { crName, proxyId: proxy.id },
                  "Updated existing ReverseProxyServer custom resource"
                );
              } catch (updateError) {
                logger.error(
                  { err: updateError, crName },
                  "Failed to update ReverseProxyServer custom resource"
                );
                throw updateError;
              }
            } else {
              throw createError;
            }
          }
        }

        reflectedReverseProxyServers.set(proxy.id, crName);
      } catch (error) {
        logger.error(
          { err: error, proxyId: proxy.id },
          "Failed to create/update ReverseProxyServer custom resource"
        );
      }
    }

    for (const [dbId, crName] of existingCRMap.entries()) {
      if (!proxies.some((p) => p.id === dbId)) {
        try {
          await customObjectsApi.deleteNamespacedCustomObject({
            group: API_GROUP,
            version: API_VERSION,
            namespace,
            plural: "reverseproxyservers",
            name: crName,
          });
          logger.info(
            { crName, proxyId: dbId },
            "Deleted ReverseProxyServer CR for removed database record"
          );
        } catch (error) {
          logger.error(
            { err: error, crName },
            "Failed to delete ReverseProxyServer custom resource"
          );
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to sync reverse proxy servers to custom resources");
  }
}
