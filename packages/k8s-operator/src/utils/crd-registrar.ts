import type { PrismaClient } from "@minikura/db";
import type { Server, ReverseProxyServer, CustomEnvironmentVariable } from "@minikura/db";
import type { KubernetesClient } from "./k8s-client";
import { API_GROUP, API_VERSION, LABEL_PREFIX } from "../config/constants";
import { MINECRAFT_SERVER_CRD } from "../crds/server";
import { REVERSE_PROXY_SERVER_CRD } from "../crds/reverseProxy";

/**
 * Sets up the CRD registration and starts a reflector to sync database state to CRDs
 */
export async function setupCRDRegistration(
  prisma: PrismaClient,
  k8sClient: KubernetesClient,
  namespace: string
): Promise<void> {
  await registerCRDs(k8sClient);
  await startCRDReflector(prisma, k8sClient, namespace);
}

/**
 * Registers the CRDs with the Kubernetes API
 */
async function registerCRDs(k8sClient: KubernetesClient): Promise<void> {
  try {
    const apiExtensionsClient = k8sClient.getApiExtensionsApi();

    console.log("Registering CRDs...");

    try {
      await apiExtensionsClient.createCustomResourceDefinition({ body: MINECRAFT_SERVER_CRD });
      console.log(`MinecraftServer CRD created successfully (${API_GROUP}/${API_VERSION})`);
    } catch (error: any) {
      if (error.response?.statusCode === 409) {
        console.log("MinecraftServer CRD already exists");
      } else {
        console.error("Error creating MinecraftServer CRD:", error);
      }
    }

    try {
      await apiExtensionsClient.createCustomResourceDefinition({ body: REVERSE_PROXY_SERVER_CRD });
      console.log(`ReverseProxyServer CRD created successfully (${API_GROUP}/${API_VERSION})`);
    } catch (error: any) {
      if (error.response?.statusCode === 409) {
        console.log("ReverseProxyServer CRD already exists");
      } else {
        console.error("Error creating ReverseProxyServer CRD:", error);
      }
    }
  } catch (error) {
    console.error("Error registering CRDs:", error);
    throw error;
  }
}

/**
 * Starts a reflector to sync database state to CRDs
 */
async function startCRDReflector(
  prisma: PrismaClient,
  k8sClient: KubernetesClient,
  namespace: string
): Promise<void> {
  const customObjectsApi = k8sClient.getCustomObjectsApi();

  // Keep track which server IDs have corresponding CRs
  const reflectedMinecraftServers = new Map<string, string>(); // DB ID -> CR name
  const reflectedReverseProxyServers = new Map<string, string>(); // DB ID -> CR name

  console.log("Starting CRD reflector...");

  // Initial sync to create CRs that reflect the DB state
  await syncDBtoCRDs(
    prisma,
    customObjectsApi,
    namespace,
    reflectedMinecraftServers,
    reflectedReverseProxyServers
  );

  // Polling interval to check for changes in the DB
  // TODO: Make this listener instead
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

/**
 * Synchronizes database state to CRDs
 */
async function syncDBtoCRDs(
  prisma: PrismaClient,
  customObjectsApi: any,
  namespace: string,
  reflectedMinecraftServers: Map<string, string>,
  reflectedReverseProxyServers: Map<string, string>
): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Starting CRD sync operation...`);
    await syncMinecraftServers(prisma, customObjectsApi, namespace, reflectedMinecraftServers);
    await syncReverseProxyServers(
      prisma,
      customObjectsApi,
      namespace,
      reflectedReverseProxyServers
    );
    console.log(`[${new Date().toISOString()}] CRD sync operation completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error syncing database to CRDs:`, error);
  }
}

/**
 * Synchronizes Minecraft server objects from the database to CRDs
 */
async function syncMinecraftServers(
  prisma: PrismaClient,
  customObjectsApi: any,
  namespace: string,
  reflectedMinecraftServers: Map<string, string>
): Promise<void> {
  try {
    const servers = await prisma.server.findMany();

    let existingCRs: any[] = [];
    try {
      const response = await customObjectsApi.listNamespacedCustomObject(
        API_GROUP,
        API_VERSION,
        namespace,
        "minecraftservers"
      );
      existingCRs = (response.body as any).items || [];
    } catch (error) {
      console.error("Error listing MinecraftServer CRs:", error);
      // TODO: Potentially better error handling here
      // For now, continue anyway - it might just be that none exist yet
    }

    // Map CR names to their corresponding DB IDs
    const existingCRMap = new Map<string, string>();
    // Map of CR names to their resourceVersions for updates
    const crResourceVersions = new Map<string, string>();

    for (const cr of existingCRs) {
      const internalId = cr.status?.internalId;
      if (internalId) {
        existingCRMap.set(internalId, cr.metadata.name);
        // Store the resourceVersion for later
        if (cr.metadata?.resourceVersion) {
          crResourceVersions.set(cr.metadata.name, cr.metadata.resourceVersion);
        }
      }
    }

    // Refresh tracking map
    reflectedMinecraftServers.clear();

    // Create or update CRs for each server
    for (const server of servers) {
      const crName = existingCRMap.get(server.id) || `${server.id.toLowerCase()}`;

      // Build the CR object
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
          memory: server.memory,
        },
        status: {
          phase: "Running",
          message: "Managed by database",
          internalId: server.id,
          apiKey: "[REDACTED]", // Don't expose actual API key
          lastSyncedAt: new Date().toISOString(),
        },
      };

      try {
        if (existingCRMap.has(server.id)) {
          // Update existing CR

          // Get the current resource first
          const crName = existingCRMap.get(server.id)!;

          try {
            // Get the existing resource to get the current resourceVersion
            const existingResource = await customObjectsApi.getNamespacedCustomObject(
              API_GROUP,
              API_VERSION,
              namespace,
              "minecraftservers",
              crName
            );

            // Extract the resourceVersion from the existing resource
            if (existingResource?.body?.metadata?.resourceVersion) {
              // Add the resourceVersion to our custom resource
              serverCR.metadata.resourceVersion = existingResource.body.metadata.resourceVersion;
            }

            // Now update with the correct resourceVersion
            await customObjectsApi.replaceNamespacedCustomObject(
              API_GROUP,
              API_VERSION,
              namespace,
              "minecraftservers",
              crName,
              serverCR
            );
            console.log(`Updated MinecraftServer CR ${crName} for server ${server.id}`);
          } catch (error) {
            console.error(`Error getting/updating MinecraftServer CR for ${server.id}:`, error);
          }
        } else {
          // Create new CR
          await customObjectsApi.createNamespacedCustomObject(
            API_GROUP,
            API_VERSION,
            namespace,
            "minecraftservers",
            serverCR
          );
          console.log(`Created MinecraftServer CR ${crName} for server ${server.id}`);
        }

        // Remember this mapping
        reflectedMinecraftServers.set(server.id, crName);
      } catch (error) {
        console.error(`Error creating/updating MinecraftServer CR for ${server.id}:`, error);
      }
    }

    // Delete CRs for servers that no longer exist
    for (const [dbId, crName] of existingCRMap.entries()) {
      if (!servers.some((s) => s.id === dbId)) {
        try {
          await customObjectsApi.deleteNamespacedCustomObject(
            API_GROUP,
            API_VERSION,
            namespace,
            "minecraftservers",
            crName
          );
          console.log(`Deleted MinecraftServer CR ${crName} for removed server ID ${dbId}`);
        } catch (error) {
          console.error(`Error deleting MinecraftServer CR ${crName}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing Minecraft servers to CRDs:", error);
  }
}

/**
 * Synchronizes Reverse Proxy server objects from the database to CRDs
 */
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
      const response = await customObjectsApi.listNamespacedCustomObject(
        API_GROUP,
        API_VERSION,
        namespace,
        "reverseproxyservers"
      );
      existingCRs = (response.body as any).items || [];
    } catch (error) {
      console.error("Error listing ReverseProxyServer CRs:", error);
      // TODO: Potentially better error handling here
      // For now, continue anyway - it might just be that none exist yet
    }

    // Map CR names to their corresponding DB IDs
    const existingCRMap = new Map<string, string>();
    // Map of CR names to their resourceVersions for updates
    const crResourceVersions = new Map<string, string>();

    for (const cr of existingCRs) {
      const internalId = cr.status?.internalId;
      if (internalId) {
        existingCRMap.set(internalId, cr.metadata.name);
        // Store the resourceVersion for later
        if (cr.metadata?.resourceVersion) {
          crResourceVersions.set(cr.metadata.name, cr.metadata.resourceVersion);
        }
      }
    }

    // Refresh tracking map
    reflectedReverseProxyServers.clear();

    // Create or update CRs for each proxy
    for (const proxy of proxies) {
      const crName = existingCRMap.get(proxy.id) || `${proxy.id.toLowerCase()}`;

      // Build the CR object
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
          memory: proxy.memory,
          environmentVariables: proxy.env_variables?.map((ev) => ({
            key: ev.key,
            value: ev.value,
          })),
        },
        status: {
          phase: "Running",
          message: "Managed by database",
          internalId: proxy.id,
          apiKey: "[REDACTED]", // Don't expose actual API key
          lastSyncedAt: new Date().toISOString(),
        },
      };

      try {
        if (existingCRMap.has(proxy.id)) {
          // Update existing CR

          // Get the current resource first
          const crName = existingCRMap.get(proxy.id)!;

          try {
            // Get the existing resource to get the current resourceVersion
            const existingResource = await customObjectsApi.getNamespacedCustomObject(
              API_GROUP,
              API_VERSION,
              namespace,
              "reverseproxyservers",
              crName
            );

            // Extract the resourceVersion from the existing resource
            if (existingResource?.body?.metadata?.resourceVersion) {
              // Add the resourceVersion to our custom resource
              proxyCR.metadata.resourceVersion = existingResource.body.metadata.resourceVersion;
            }

            // Now update with the correct resourceVersion
            await customObjectsApi.replaceNamespacedCustomObject(
              API_GROUP,
              API_VERSION,
              namespace,
              "reverseproxyservers",
              crName,
              proxyCR
            );
            console.log(`Updated ReverseProxyServer CR ${crName} for proxy ${proxy.id}`);
          } catch (error) {
            console.error(`Error getting/updating ReverseProxyServer CR for ${proxy.id}:`, error);
          }
        } else {
          // Create new CR
          await customObjectsApi.createNamespacedCustomObject(
            API_GROUP,
            API_VERSION,
            namespace,
            "reverseproxyservers",
            proxyCR
          );
          console.log(`Created ReverseProxyServer CR ${crName} for proxy ${proxy.id}`);
        }

        // Remember this mapping
        reflectedReverseProxyServers.set(proxy.id, crName);
      } catch (error) {
        console.error(`Error creating/updating ReverseProxyServer CR for ${proxy.id}:`, error);
      }
    }

    // Delete CRs for proxies that no longer exist
    for (const [dbId, crName] of existingCRMap.entries()) {
      if (!proxies.some((p) => p.id === dbId)) {
        try {
          await customObjectsApi.deleteNamespacedCustomObject(
            API_GROUP,
            API_VERSION,
            namespace,
            "reverseproxyservers",
            crName
          );
          console.log(`Deleted ReverseProxyServer CR ${crName} for removed proxy ID ${dbId}`);
        } catch (error) {
          console.error(`Error deleting ReverseProxyServer CR ${crName}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing Reverse Proxy servers to CRDs:", error);
  }
}
