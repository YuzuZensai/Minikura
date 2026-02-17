import { API_GROUP, NAMESPACE } from "../config/constants";

export const minikuraNamespace = {
  apiVersion: "v1",
  kind: "Namespace",
  metadata: {
    name: NAMESPACE,
  },
};

export const minikuraServiceAccount = {
  apiVersion: "v1",
  kind: "ServiceAccount",
  metadata: {
    name: "minikura-operator",
    namespace: NAMESPACE,
  },
};

export const minikuraClusterRole = {
  apiVersion: "rbac.authorization.k8s.io/v1",
  kind: "ClusterRole",
  metadata: {
    name: "minikura-operator-role",
  },
  rules: [
    {
      apiGroups: [""],
      resources: ["configmaps", "services", "secrets"],
      verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
    },
    {
      apiGroups: ["apps"],
      resources: ["deployments", "statefulsets"],
      verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
    },
    {
      apiGroups: ["networking.k8s.io"],
      resources: ["ingresses"],
      verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
    },
    {
      apiGroups: ["apiextensions.k8s.io"],
      resources: ["customresourcedefinitions"],
      verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
    },
    {
      apiGroups: [API_GROUP],
      resources: ["minecraftservers", "velocityproxies"],
      verbs: ["get", "list", "watch", "create", "update", "patch", "delete"],
    },
    {
      apiGroups: [API_GROUP],
      resources: ["minecraftservers/status", "velocityproxies/status"],
      verbs: ["get", "update", "patch"],
    },
  ],
};

export const minikuraClusterRoleBinding = {
  apiVersion: "rbac.authorization.k8s.io/v1",
  kind: "ClusterRoleBinding",
  metadata: {
    name: "minikura-operator-role-binding",
  },
  subjects: [
    {
      kind: "ServiceAccount",
      name: "minikura-operator",
      namespace: NAMESPACE,
    },
  ],
  roleRef: {
    kind: "ClusterRole",
    name: "minikura-operator-role",
    apiGroup: "rbac.authorization.k8s.io",
  },
};

export const minikuraOperatorDeployment = {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: "minikura-operator",
    namespace: NAMESPACE,
  },
  spec: {
    replicas: 1,
    selector: {
      matchLabels: {
        app: "minikura-operator",
      },
    },
    template: {
      metadata: {
        labels: {
          app: "minikura-operator",
        },
      },
      spec: {
        serviceAccountName: "minikura-operator",
        containers: [
          {
            name: "operator",
            image: "${REGISTRY_URL}/minikura-operator:latest",
            env: [
              {
                name: "DATABASE_URL",
                valueFrom: {
                  secretKeyRef: {
                    name: "minikura-operator-secrets",
                    key: "DATABASE_URL",
                  },
                },
              },
              {
                name: "KUBERNETES_NAMESPACE",
                value: NAMESPACE,
              },
              {
                name: "USE_CRDS",
                value: "true",
              },
            ],
            resources: {
              requests: {
                memory: "256Mi",
                cpu: "200m",
              },
              limits: {
                memory: "512Mi",
                cpu: "500m",
              },
            },
            livenessProbe: {
              exec: {
                command: ["bun", "-e", "console.log('Health check')"],
              },
              initialDelaySeconds: 30,
              periodSeconds: 30,
            },
            readinessProbe: {
              exec: {
                command: ["bun", "-e", "console.log('Ready check')"],
              },
              initialDelaySeconds: 5,
              periodSeconds: 10,
            },
          },
        ],
      },
    },
  },
};
