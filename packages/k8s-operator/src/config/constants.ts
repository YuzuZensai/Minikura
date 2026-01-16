import { dotenvLoad } from "dotenv-mono";
const dotenv = dotenvLoad();

export const API_GROUP = "minikura.kirameki.cafe";
export const API_VERSION = "v1alpha1";

export const KUBERNETES_NAMESPACE_ENV = process.env.KUBERNETES_NAMESPACE;
export const NAMESPACE = process.env.KUBERNETES_NAMESPACE || "minikura";

export const ENABLE_CRD_REFLECTION = process.env.ENABLE_CRD_REFLECTION === "true";
export const SKIP_TLS_VERIFY = process.env.KUBERNETES_SKIP_TLS_VERIFY === "true";

if (SKIP_TLS_VERIFY) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Resource types
export const RESOURCE_TYPES = {
  MINECRAFT_SERVER: {
    kind: "MinecraftServer",
    plural: "minecraftservers",
    singular: "minecraftserver",
    shortNames: ["mcs"],
  },
  REVERSE_PROXY_SERVER: {
    kind: "ReverseProxyServer",
    plural: "reverseproxyservers",
    singular: "reverseproxyserver",
    shortNames: ["rps"],
  },
};

// Kubernetes resource label prefixes
export const LABEL_PREFIX = "minikura.kirameki.cafe";

// Polling intervals (in milliseconds)
export const SYNC_INTERVAL = 30 * 1000; // 30 seconds

export const IMAGES = {
  MINECRAFT: "itzg/minecraft-server",
  REVERSE_PROXY: "itzg/minecraft-server",
};

export const DEFAULTS = {
  MEMORY: "1G",
  CPU_REQUEST: "250m",
  CPU_LIMIT: "1000m",
  STORAGE_SIZE: "1Gi",
};
