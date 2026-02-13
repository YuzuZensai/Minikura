#!/bin/bash
# Setup RBAC for Minikura
# This script creates service accounts with appropriate permissions
# for the backend (read-only) and operator (read/write)

set -e

NAMESPACE="${KUBERNETES_NAMESPACE:-minikura}"

echo "================================================"
echo "  Minikura Kubernetes RBAC Setup"
echo "================================================"
echo ""
echo "Namespace: $NAMESPACE"
echo ""

# Create namespace if it doesn't exist
if ! kubectl get namespace $NAMESPACE &>/dev/null; then
    echo "Creating namespace: $NAMESPACE"
    kubectl create namespace $NAMESPACE
    echo "[OK] Namespace created"
else
    echo "[OK] Namespace already exists"
fi
echo ""

# Apply RBAC manifests
echo "================================================"
echo "  Creating Service Accounts and RBAC"
echo "================================================"
echo ""

# Dev (Backend) RBAC
echo "1. Backend Service Account (minikura-dev)"
echo "   - Read-only access to cluster resources"
kubectl apply -f k8s/rbac/dev-rbac.yaml
echo "   [OK] Created"
echo ""

# Operator RBAC
echo "2. Operator Service Account (minikura-operator)"
echo "   - Full read/write access to cluster resources"
kubectl apply -f k8s/rbac/operator-rbac.yaml
echo "   [OK] Created"
echo ""

# Wait for tokens to be generated
echo "================================================"
echo "  Waiting for Tokens"
echo "================================================"
echo ""
echo "Kubernetes needs a few seconds to generate tokens..."
sleep 5

# Get tokens
DEV_TOKEN=$(kubectl get secret minikura-dev-token -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d)
OPERATOR_TOKEN=$(kubectl get secret minikura-operator-token -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d)

if [ -z "$DEV_TOKEN" ] || [ -z "$OPERATOR_TOKEN" ]; then
    echo "[WARNING]  Tokens not ready yet. Wait a moment and run:"
    echo "   bun run k8s:token"
    echo ""
else
    echo "[OK] Tokens generated successfully"
    echo ""
fi

# Update .env file
ENV_FILE=".env"

if [ -f "$ENV_FILE" ] && [ -n "$OPERATOR_TOKEN" ]; then
    echo "================================================"
    echo "  Updating .env"
    echo "================================================"
    echo ""
    
    if grep -q "^KUBERNETES_SERVICE_ACCOUNT_TOKEN=" "$ENV_FILE"; then
        sed -i "s|^KUBERNETES_SERVICE_ACCOUNT_TOKEN=.*|KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$OPERATOR_TOKEN\"|" "$ENV_FILE"
        echo "[OK] Updated KUBERNETES_SERVICE_ACCOUNT_TOKEN"
    else
        echo "KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$OPERATOR_TOKEN\"" >> "$ENV_FILE"
        echo "[OK] Added KUBERNETES_SERVICE_ACCOUNT_TOKEN"
    fi
    echo ""
fi

echo "================================================"
echo "  [OK] Setup Complete"
echo "================================================"
echo ""
echo "Service accounts created:"
echo "  • minikura-dev (backend) - read-only"
echo "  • minikura-operator - full access"
echo ""
echo "To view tokens:"
echo "  bun run k8s:token"
echo ""
echo "Next steps:"
echo "  1. Restart backend: bun run dev"
echo "  2. Restart operator: bun run k8s:dev"
echo ""
