#!/bin/bash
set -e

NAMESPACE="minikura"
SERVICE_ACCOUNT="minikura-backend"
SECRET_NAME="minikura-backend-token"

echo "==> Setting up Kubernetes service account..."

# Create service account if it doesn't exist
kubectl create serviceaccount $SERVICE_ACCOUNT -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true

# Create RBAC role
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: minikura-backend-role
  namespace: $NAMESPACE
rules:
- apiGroups: [""]
  resources: ["services", "pods", "pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list"]
EOF

# Create role binding
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: minikura-backend-rolebinding
  namespace: $NAMESPACE
subjects:
- kind: ServiceAccount
  name: $SERVICE_ACCOUNT
  namespace: $NAMESPACE
roleRef:
  kind: Role
  name: minikura-backend-role
  apiGroup: rbac.authorization.k8s.io
EOF

# Create secret for service account token
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: $SECRET_NAME
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/service-account.name: $SERVICE_ACCOUNT
type: kubernetes.io/service-account-token
EOF

echo "==> Waiting for token to be generated..."
sleep 3

# Get the token
TOKEN=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d)

if [ -z "$TOKEN" ]; then
    echo "[ERROR] Failed to retrieve service account token"
    exit 1
fi

echo ""
echo "=============================================="
echo "[OK] Service Account Token Retrieved"
echo "=============================================="
echo "Service Account: $SERVICE_ACCOUNT"
echo "Namespace: $NAMESPACE"
echo "Token: ${TOKEN:0:50}...${TOKEN: -20}"
echo ""

# Update .env file with the new token
ENV_FILE="/workspace/.env"

if [ -f "$ENV_FILE" ]; then
    # Check if token line exists
    if grep -q "^KUBERNETES_SERVICE_ACCOUNT_TOKEN=" "$ENV_FILE"; then
        # Update existing token
        sed -i "s|^KUBERNETES_SERVICE_ACCOUNT_TOKEN=.*|KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$TOKEN\"|" "$ENV_FILE"
        echo "[OK] Updated KUBERNETES_SERVICE_ACCOUNT_TOKEN in .env"
    else
        # Add token to end of file
        echo "KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$TOKEN\"" >> "$ENV_FILE"
        echo "[OK] Added KUBERNETES_SERVICE_ACCOUNT_TOKEN to .env"
    fi
else
    echo "[WARNING]  .env file not found at $ENV_FILE"
fi

echo "=============================================="
echo ""
