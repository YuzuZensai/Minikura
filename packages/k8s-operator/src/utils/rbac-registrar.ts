import type { KubernetesClient } from "./k8s-client";
import {
  minikuraNamespace,
  minikuraServiceAccount,
  minikuraClusterRole,
  minikuraClusterRoleBinding,
  minikuraOperatorDeployment,
} from "../crds/rbac";
import fetch from "node-fetch";

/**
 * Registers all RBAC resources required
 * @param k8sClient The Kubernetes client instance
 */
export async function registerRBACResources(k8sClient: KubernetesClient): Promise<void> {
  try {
    console.log("Starting RBAC resources registration...");

    await registerNamespace(k8sClient);
    await registerServiceAccount(k8sClient);
    await registerClusterRole(k8sClient);
    await registerClusterRoleBinding(k8sClient);

    console.log("RBAC resources registration completed successfully");
  } catch (error: any) {
    console.error("Error registering RBAC resources:", error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.statusCode}`);
      console.error(`Response body: ${JSON.stringify(error.response.body)}`);
    }
    throw error;
  }
}

/**
 * Registers the namespace
 */
async function registerNamespace(k8sClient: KubernetesClient): Promise<void> {
  try {
    const coreApi = k8sClient.getCoreApi();
    await coreApi.createNamespace(minikuraNamespace);
    console.log(`Created namespace ${minikuraNamespace.metadata.name}`);
  } catch (error: any) {
    if (error.response?.statusCode === 409) {
      console.log(`Namespace ${minikuraNamespace.metadata.name} already exists`);
    } else {
      throw error;
    }
  }
}

/**
 * Registers the service account
 */
async function registerServiceAccount(k8sClient: KubernetesClient): Promise<void> {
  try {
    const coreApi = k8sClient.getCoreApi();
    await coreApi.createNamespacedServiceAccount(
      minikuraServiceAccount.metadata.namespace,
      minikuraServiceAccount
    );
    console.log(`Created service account ${minikuraServiceAccount.metadata.name}`);
  } catch (error: any) {
    if (error.response?.statusCode === 409) {
      console.log(`Service account ${minikuraServiceAccount.metadata.name} already exists`);
    } else {
      throw error;
    }
  }
}

/**
 * Registers the cluster role
 */
async function registerClusterRole(k8sClient: KubernetesClient): Promise<void> {
  try {
    // TODO: I can't get this working with the k8s client, so I'm using fetch directly, fix later
    const kc = k8sClient.getKubeConfig();
    const opts = {};
    kc.applyToRequest(opts as any);

    // Get cluster URL
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
        console.log(`Created cluster role ${minikuraClusterRole.metadata.name}`);
      } else if (response.status === 409) {
        console.log(`Cluster role ${minikuraClusterRole.metadata.name} already exists`);
      } else {
        const text = await response.text();
        throw new Error(
          `Failed to create cluster role: ${response.status} ${response.statusText} - ${text}`
        );
      }
    } catch (error: any) {
      // If the error message contains "already exists", that's OK
      if (error.message?.includes("already exists") || error.message?.includes("409")) {
        console.log(`Cluster role ${minikuraClusterRole.metadata.name} already exists`);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error(`Error registering cluster role:`, error.message);
    throw error;
  }
}

/**
 * Registers the Minikura cluster role binding
 */
async function registerClusterRoleBinding(k8sClient: KubernetesClient): Promise<void> {
  try {
    // We need to use the raw client for cluster roles
    const kc = k8sClient.getKubeConfig();
    const opts = {};
    kc.applyToRequest(opts as any);

    // Get cluster URL
    const cluster = kc.getCurrentCluster();
    if (!cluster) {
      throw new Error("No active cluster found in KubeConfig");
    }

    // Create the cluster role binding
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
        console.log(`Created cluster role binding ${minikuraClusterRoleBinding.metadata.name}`);
      } else if (response.status === 409) {
        console.log(
          `Cluster role binding ${minikuraClusterRoleBinding.metadata.name} already exists`
        );
      } else {
        const text = await response.text();
        throw new Error(
          `Failed to create cluster role binding: ${response.status} ${response.statusText} - ${text}`
        );
      }
    } catch (error: any) {
      // If the error message contains "already exists"
      // TODO: Potentially better error handling here
      if (error.message?.includes("already exists") || error.message?.includes("409")) {
        console.log(
          `Cluster role binding ${minikuraClusterRoleBinding.metadata.name} already exists`
        );
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error(`Error registering cluster role binding:`, error.message);
    throw error;
  }
}

/**
 * Registers the Minikura operator deployment
 * Note: This requires the secret to be created first
 */
export async function registerOperatorDeployment(
  k8sClient: KubernetesClient,
  registryUrl: string
): Promise<void> {
  try {
    // Replace the registry URL placeholder, for future use
    const deployment = JSON.parse(
      JSON.stringify(minikuraOperatorDeployment).replace("${REGISTRY_URL}", registryUrl)
    );

    const appsApi = k8sClient.getAppsApi();
    await appsApi.createNamespacedDeployment(deployment.metadata.namespace, deployment);
    console.log(`Created deployment ${deployment.metadata.name}`);
  } catch (error: any) {
    if (error.response?.statusCode === 409) {
      console.log(`Deployment ${minikuraOperatorDeployment.metadata.name} already exists`);
      // Update the deployment if it already exists
      const deployment = JSON.parse(
        JSON.stringify(minikuraOperatorDeployment).replace("${REGISTRY_URL}", registryUrl)
      );

      await k8sClient
        .getAppsApi()
        .replaceNamespacedDeployment(
          deployment.metadata.name,
          deployment.metadata.namespace,
          deployment
        );
      console.log(`Updated deployment ${deployment.metadata.name}`);
    } else {
      throw error;
    }
  }
}
