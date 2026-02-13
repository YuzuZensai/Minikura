#!/bin/bash
# Quick script to refresh the Kubernetes service account token
# Run this if you need to regenerate or check the token

set -e

NAMESPACE="${KUBERNETES_NAMESPACE:-minikura}"
SERVICE_ACCOUNT="minikura-backend"
SECRET_NAME="minikura-backend-token"

echo "[INFO] Checking Kubernetes service account token..."
echo ""

# Check if service account exists
if ! kubectl get serviceaccount $SERVICE_ACCOUNT -n $NAMESPACE &>/dev/null; then
    echo "[ERROR] Service account '$SERVICE_ACCOUNT' not found in namespace '$NAMESPACE'"
    echo ""
    echo "Run the full setup script:"
    echo "  bash .devcontainer/setup-k8s-token.sh"
    exit 1
fi

# Check if secret exists
if ! kubectl get secret $SECRET_NAME -n $NAMESPACE &>/dev/null; then
    echo "[ERROR] Secret '$SECRET_NAME' not found in namespace '$NAMESPACE'"
    echo ""
    echo "Run the full setup script:"
    echo "  bash .devcontainer/setup-k8s-token.sh"
    exit 1
fi

# Get the token
TOKEN=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d)

if [ -z "$TOKEN" ]; then
    echo "[ERROR] Failed to retrieve service account token"
    exit 1
fi

echo "=============================================="
echo "[OK] Service Account Token"
echo "=============================================="
echo "Service Account: $SERVICE_ACCOUNT"
echo "Namespace: $NAMESPACE"
echo ""
echo "Token (first 50 chars): ${TOKEN:0:50}..."
echo "Token (last 20 chars): ...${TOKEN: -20}"
echo ""
echo "Full token:"
echo "$TOKEN"
echo ""

# Update .env file if it exists
ENV_FILE="$(pwd)/.env"

if [ -f "$ENV_FILE" ]; then
    echo "=============================================="
    echo "[UPDATE] Updating .env file"
    echo "=============================================="
    
    if grep -q "^KUBERNETES_SERVICE_ACCOUNT_TOKEN=" "$ENV_FILE"; then
        sed -i "s|^KUBERNETES_SERVICE_ACCOUNT_TOKEN=.*|KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$TOKEN\"|" "$ENV_FILE"
        echo "[OK] Updated KUBERNETES_SERVICE_ACCOUNT_TOKEN in .env"
    else
        echo "KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"$TOKEN\"" >> "$ENV_FILE"
        echo "[OK] Added KUBERNETES_SERVICE_ACCOUNT_TOKEN to .env"
    fi
    echo ""
fi

echo "=============================================="
echo "[WARNING]  Remember to restart your backend/operator"
echo "=============================================="
echo ""
