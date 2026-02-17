import { existsSync } from "node:fs";
import { KubeConfig } from "@kubernetes/client-node";
import { createLogger } from "./logger";

const logger = createLogger("kube-auth");

export function buildKubeConfig(): KubeConfig {
  const kc = new KubeConfig();

  const isInCluster =
    process.env.KUBERNETES_SERVICE_HOST &&
    existsSync("/var/run/secrets/kubernetes.io/serviceaccount/token");

  if (isInCluster) {
    logger.info("Running in-cluster, loading from service account");
    kc.loadFromCluster();
  } else {
    logger.info("Running locally, loading from kubeconfig");
    kc.loadFromDefault();
    logger.info({ context: kc.getCurrentContext() }, "Using context");
  }

  return kc;
}
