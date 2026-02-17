import fetch from "node-fetch";
import {
  minikuraClusterRole,
  minikuraClusterRoleBinding,
  minikuraNamespace,
  minikuraOperatorDeployment,
  minikuraServiceAccount,
} from "../crds/rbac";
import type { KubernetesClient } from "./k8s-client";
import { logger } from "./logger";

export async function registerRBACResources(k8sClient: KubernetesClient): Promise<void> {
  try {
    logger.info("Starting RBAC resources registration");

    await registerNamespace(k8sClient);
    await registerServiceAccount(k8sClient);
    await registerClusterRole(k8sClient);
    await registerClusterRoleBinding(k8sClient);

    logger.info("RBAC resources registration completed successfully");
  } catch (error: any) {
    logger.error(
      {
        err: error,
        message: error.message,
        statusCode: error.response?.statusCode,
        body: error.response?.body,
      },
      "Error registering RBAC resources"
    );
    if (error.response) {
    }
    throw error;
  }
}

async function registerNamespace(k8sClient: KubernetesClient): Promise<void> {
  try {
    const coreApi = k8sClient.getCoreApi();
    await coreApi.createNamespace({ body: minikuraNamespace });
    logger.info({ namespace: minikuraNamespace.metadata.name }, "Created namespace");
  } catch (error: any) {
    if (error.code === 409) {
      logger.debug({ namespace: minikuraNamespace.metadata.name }, "Namespace already exists");
    } else {
      throw error;
    }
  }
}

async function registerServiceAccount(k8sClient: KubernetesClient): Promise<void> {
  try {
    const coreApi = k8sClient.getCoreApi();
    await coreApi.createNamespacedServiceAccount({
      namespace: minikuraServiceAccount.metadata.namespace,
      body: minikuraServiceAccount,
    });
    logger.info(
      { serviceAccount: minikuraServiceAccount.metadata.name },
      "Created service account"
    );
  } catch (error: any) {
    if (error.code === 409) {
      logger.debug(`Service account ${minikuraServiceAccount.metadata.name} already exists`);
    } else {
      throw error;
    }
  }
}

async function registerClusterRole(k8sClient: KubernetesClient): Promise<void> {
  try {
    const kc = k8sClient.getKubeConfig();
    const opts: any = {};
    await kc.applyToHTTPSOptions(opts);

    const cluster = kc.getCurrentCluster();
    if (!cluster) {
      throw new Error("No active cluster found in KubeConfig");
    }

    try {
      const response = await fetch(
        `${cluster.server}/apis/rbac.authorization.k8s.io/v1/clusterroles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(opts as any).headers,
          },
          body: JSON.stringify(minikuraClusterRole),
          agent: (opts as any).agent,
        }
      );

      if (response.ok) {
        logger.debug(`Created cluster role ${minikuraClusterRole.metadata.name}`);
      } else if (response.status === 409) {
        logger.debug(`Cluster role ${minikuraClusterRole.metadata.name} already exists`);
      } else {
        const text = await response.text();
        throw new Error(
          `Failed to create cluster role: ${response.status} ${response.statusText} - ${text}`
        );
      }
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("409")) {
        logger.debug(`Cluster role ${minikuraClusterRole.metadata.name} already exists`);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    logger.error(`Error registering cluster role:`, error.message);
    throw error;
  }
}

async function registerClusterRoleBinding(k8sClient: KubernetesClient): Promise<void> {
  try {
    const kc = k8sClient.getKubeConfig();
    const opts: any = {};
    await kc.applyToHTTPSOptions(opts);

    const cluster = kc.getCurrentCluster();
    if (!cluster) {
      throw new Error("No active cluster found in KubeConfig");
    }

    const { default: fetch } = await import("node-fetch");

    try {
      const response = await fetch(
        `${cluster.server}/apis/rbac.authorization.k8s.io/v1/clusterrolebindings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(opts as any).headers,
          },
          body: JSON.stringify(minikuraClusterRoleBinding),
          agent: (opts as any).agent,
        }
      );

      if (response.ok) {
        logger.debug(`Created cluster role binding ${minikuraClusterRoleBinding.metadata.name}`);
      } else if (response.status === 409) {
        logger.debug(
          `Cluster role binding ${minikuraClusterRoleBinding.metadata.name} already exists`
        );
      } else {
        const text = await response.text();
        throw new Error(
          `Failed to create cluster role binding: ${response.status} ${response.statusText} - ${text}`
        );
      }
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("409")) {
        logger.debug(
          `Cluster role binding ${minikuraClusterRoleBinding.metadata.name} already exists`
        );
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    logger.error(`Error registering cluster role binding:`, error.message);
    throw error;
  }
}

export async function registerOperatorDeployment(
  k8sClient: KubernetesClient,
  registryUrl: string
): Promise<void> {
  try {
    const deployment = JSON.parse(
      JSON.stringify(minikuraOperatorDeployment).replace("${REGISTRY_URL}", registryUrl)
    );

    const appsApi = k8sClient.getAppsApi();
    await appsApi.createNamespacedDeployment(deployment.metadata.namespace, deployment);
    logger.debug(`Created deployment ${deployment.metadata.name}`);
  } catch (error: any) {
    if (error.code === 409) {
      logger.debug(`Deployment ${minikuraOperatorDeployment.metadata.name} already exists`);
      const deployment = JSON.parse(
        JSON.stringify(minikuraOperatorDeployment).replace("${REGISTRY_URL}", registryUrl)
      );

      await k8sClient.getAppsApi().replaceNamespacedDeployment({
        name: deployment.metadata.name,
        namespace: deployment.metadata.namespace,
        body: deployment,
      });
      logger.debug(`Updated deployment ${deployment.metadata.name}`);
    } else {
      throw error;
    }
  }
}
