#!/bin/bash
# Script to display all Kubernetes service account tokens for Bun
# Bun has issues with TLS client certificates, so we use bearer tokens instead

set -e

NAMESPACE="${KUBERNETES_NAMESPACE:-minikura}"

echo "================================================"
echo "  Kubernetes Service Account Tokens for Bun"
echo "================================================"
echo ""

# Backend token
echo "1. Backend Token (minikura-dev - read-only)"
echo "   Service Account: minikura-dev"
echo "   Permissions: Read services, pods, deployments, etc."
echo ""
BACKEND_TOKEN=$(kubectl get secret minikura-dev-token -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d)
if [ -z "$BACKEND_TOKEN" ]; then
    echo "   [ERROR] Token not found. Run: bash .devcontainer/setup-k8s-token.sh"
else
    echo "   Token: ${BACKEND_TOKEN:0:50}...${BACKEND_TOKEN: -20}"
fi
echo ""

# Operator token
echo "2. Operator Token (minikura-operator - read/write)"
echo "   Service Account: minikura-operator"
echo "   Permissions: Full control over resources"
echo ""
OPERATOR_TOKEN=$(kubectl get secret minikura-operator-token -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d)
if [ -z "$OPERATOR_TOKEN" ]; then
    echo "   [ERROR] Token not found. Creating service account..."
    bash .devcontainer/setup-k8s-token.sh
    OPERATOR_TOKEN=$(kubectl get secret minikura-operator-token -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d)
fi
if [ -n "$OPERATOR_TOKEN" ]; then
    echo "   Token: ${OPERATOR_TOKEN:0:50}...${OPERATOR_TOKEN: -20}"
fi
echo ""

# Update .env file
ENV_FILE="$(pwd)/.env"

if [ -f "$ENV_FILE" ] && [ -n "$BACKEND_TOKEN" ]; then
    echo "================================================"
    echo "  Updating .env file"
    echo "================================================"
    
    if grep -q "^KUBERNETES_SERVICE_ACCOUNT_TOKEN=" "$ENV_FILE"; then
        # Backend and operator use the same token for now (operator has more permissions)
        # In production, you'd want separate tokens
        sed -i "s|^KUBERNETES_SERVICE_ACCOUNT_TOKEN=.*|KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$OPERATOR_TOKEN\"|" "$ENV_FILE"
        echo "[OK] Updated KUBERNETES_SERVICE_ACCOUNT_TOKEN (using operator token)"
    else
        echo "KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$OPERATOR_TOKEN\"" >> "$ENV_FILE"
        echo "[OK] Added KUBERNETES_SERVICE_ACCOUNT_TOKEN (using operator token)"
    fi
    echo ""
fi

echo "================================================"
echo "  Usage"
echo "================================================"
echo "Both backend and operator will use the operator token from .env"
echo "The token is automatically detected when running with Bun."
echo ""
echo "To see full tokens:"
echo "  kubectl get secret minikura-dev-token -n $NAMESPACE -o jsonpath='{.data.token}' | base64 -d"
echo "  kubectl get secret minikura-operator-token -n $NAMESPACE -o jsonpath='{.data.token}' | base64 -d"
echo ""
echo "[WARNING]  Restart backend and operator after updating tokens:"
echo "  bun run dev"
echo "  bun run k8s:dev"
echo "================================================"
