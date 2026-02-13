import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { KubeConfig } from "@kubernetes/client-node";
import { spawnSync } from "bun";
import YAML from "yaml";

type KubeConfigDoc = {
  users?: Array<{ name: string; user: { token?: string } }>;
  contexts?: Array<{
    name: string;
    context: { cluster: string; user: string; namespace?: string };
  }>;
  clusters?: Array<{ name: string }>;
};

const SA_NAME = process.env.K8S_SA_NAME || "minikura-backend";
const NAMESPACE = process.env.KUBERNETES_NAMESPACE || "minikura";
const TOKEN_DURATION_HOURS = Number(process.env.K8S_TOKEN_DURATION_HOURS || 24);
const TOKEN_REFRESH_MIN = Number(process.env.K8S_TOKEN_REFRESH_MIN || 60);

function kubeconfigPath(): string {
  return process.env.KUBECONFIG || `${process.env.HOME || process.env.USERPROFILE}/.kube/config`;
}

function refreshSaToken(): void {
  const duration = `${TOKEN_DURATION_HOURS}h`;
  const args = ["kubectl", "-n", NAMESPACE, "create", "token", SA_NAME, "--duration", duration];

  if (process.env.KUBERNETES_SKIP_TLS_VERIFY === "true") {
    args.push("--insecure-skip-tls-verify");
  }

  const proc = spawnSync(args);

  if (proc.exitCode !== 0) {
    console.error("[kube-auth] kubectl create token failed:", proc.stderr.toString());
    return;
  }

  const token = proc.stdout.toString().trim();
  const kcPath = kubeconfigPath();

  if (!existsSync(kcPath)) {
    console.error("[kube-auth] kubeconfig not found at:", kcPath);
    return;
  }

  const doc = YAML.parse(readFileSync(kcPath, "utf8")) as KubeConfigDoc;

  let user = doc.users?.find((existingUser) => existingUser.name === SA_NAME);
  if (!user) {
    user = { name: SA_NAME, user: {} };
    if (!doc.users) doc.users = [];
    doc.users.push(user);
  }
  user.user = { token };

  let ctx = doc.contexts?.find((context) => context.name === "bun-local");
  if (!ctx) {
    const clusterName = doc.clusters?.[0]?.name || "default";
    ctx = {
      name: "bun-local",
      context: {
        cluster: clusterName,
        user: SA_NAME,
        namespace: NAMESPACE,
      },
    };
    if (!doc.contexts) doc.contexts = [];
    doc.contexts.push(ctx);
  } else {
    ctx.context.user = SA_NAME;
    ctx.context.namespace = NAMESPACE;
  }

  writeFileSync(kcPath, YAML.stringify(doc));
  console.log(
    `[kube-auth] kubeconfig updated with fresh token for ${SA_NAME} (expires in ${duration})`
  );
}

export function buildKubeConfig(): KubeConfig {
  const kc = new KubeConfig();

  const isInCluster =
    process.env.KUBERNETES_SERVICE_HOST &&
    existsSync("/var/run/secrets/kubernetes.io/serviceaccount/token");

  if (isInCluster) {
    console.log("[kube-auth] Running in-cluster, loading from service account");
    kc.loadFromCluster();
    return kc;
  }

  console.log("[kube-auth] Running locally, using ServiceAccount token auth");
  refreshSaToken();

  setInterval(refreshSaToken, TOKEN_REFRESH_MIN * 60_000);

  kc.loadFromDefault();
  try {
    kc.setCurrentContext("bun-local");
  } catch (_error) {
    console.warn("[kube-auth] Could not set bun-local context, using default");
  }

  return kc;
}
