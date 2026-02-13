import { Elysia } from "elysia";
import { authPlugin } from "../lib/auth-plugin";
import { requireAuth } from "../lib/middleware";
import { K8sService } from "../services/k8s";

export const k8sRoutes = new Elysia({ prefix: "/k8s" })
  .use(authPlugin)
  .get(
    "/status",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return k8sService.getConnectionInfo();
    })
  )
  .get(
    "/pods",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getPods();
    })
  )
  .get(
    "/deployments",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getDeployments();
    })
  )
  .get(
    "/statefulsets",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getStatefulSets();
    })
  )
  .get(
    "/services",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getServices();
    })
  )
  .get(
    "/configmaps",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getConfigMaps();
    })
  )
  .get(
    "/ingresses",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getIngresses();
    })
  )
  .get(
    "/minecraft-servers",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getMinecraftServers();
    })
  )
  .get(
    "/reverse-proxy-servers",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getReverseProxyServers();
    })
  )
  .get(
    "/pods/:podName",
    requireAuth(async ({ params }) => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getPodInfo(params.podName);
    })
  )
  .get(
    "/pods/:podName/logs",
    requireAuth(async ({ params, query, set }) => {
      const k8sService = K8sService.getInstance();
      const options = {
        container: query.container as string | undefined,
        tailLines: query.tailLines ? parseInt(query.tailLines as string, 10) : 1000,
        timestamps: query.timestamps === "true",
        sinceSeconds: query.sinceSeconds ? parseInt(query.sinceSeconds as string, 10) : undefined,
      };
      const logs = await k8sService.getPodLogs(params.podName, options);

      // Return as plain text
      const headers = (set.headers ?? {}) as Record<string, string>;
      headers["content-type"] = "text/plain";
      set.headers = headers;
      return logs;
    })
  )
  .get(
    "/servers/:serverId/pods",
    requireAuth(async ({ params }) => {
      const k8sService = K8sService.getInstance();
      const labelSelector = `minikura.kirameki.cafe/server-id=${params.serverId}`;
      return await k8sService.getPodsByLabel(labelSelector);
    })
  )
  .get(
    "/reverse-proxy/:serverId/pods",
    requireAuth(async ({ params }) => {
      const k8sService = K8sService.getInstance();
      // Reverse proxy servers use either 'velocity-{id}' or 'bungeecord-{id}' pattern
      // We need to check both patterns or use the proxy-id label
      const labelSelector = `minikura.kirameki.cafe/proxy-id=${params.serverId}`;
      return await k8sService.getPodsByLabel(labelSelector);
    })
  )
  .get(
    "/services/:serviceName",
    requireAuth(async ({ params }) => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getServiceInfo(params.serviceName);
    })
  )
  .get(
    "/services/:serviceName/connection-info",
    requireAuth(async ({ params }) => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getServerConnectionInfo(params.serviceName);
    })
  )
  .get(
    "/nodes",
    requireAuth(async () => {
      const k8sService = K8sService.getInstance();
      return await k8sService.getNodes();
    })
  );
