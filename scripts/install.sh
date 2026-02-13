#!/bin/bash
# Minikura Installer
# This script installs Minikura on a Kubernetes cluster

set -e

NAMESPACE="${KUBERNETES_NAMESPACE:-minikura}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔════════════════════════════════════════════════╗"
echo "║       Minikura Kubernetes Installer            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "-> Checking prerequisites..."
if ! command -v kubectl &> /dev/null; then
    echo "[ERROR] kubectl not found. Please install kubectl first."
    exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
    echo "[ERROR] Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

echo "[OK] kubectl found"
echo "[OK] Connected to Kubernetes cluster"
echo ""

# Step 1: Create namespace
echo "-> Creating namespace: $NAMESPACE"
if kubectl get namespace $NAMESPACE &>/dev/null; then
    echo "[OK] Namespace already exists"
else
    kubectl create namespace $NAMESPACE
    echo "[OK] Namespace created"
fi
echo ""

# Step 2: Apply RBAC
echo "-> Setting up RBAC (Service Accounts & Permissions)"
kubectl apply -f "$PROJECT_ROOT/k8s/rbac/dev-rbac.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/rbac/operator-rbac.yaml"
echo "[OK] RBAC configured"
echo "  • minikura-dev (read-only)"
echo "  • minikura-operator (full access)"
echo ""

# Step 3: Wait for tokens
echo "-> Waiting for service account tokens..."
sleep 3

DEV_TOKEN=""
OPERATOR_TOKEN=""
for i in {1..10}; do
    DEV_TOKEN=$(kubectl get secret minikura-dev-token -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d || echo "")
    OPERATOR_TOKEN=$(kubectl get secret minikura-operator-token -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | base64 -d || echo "")
    
    if [ -n "$DEV_TOKEN" ] && [ -n "$OPERATOR_TOKEN" ]; then
        break
    fi
    
    sleep 2
done

if [ -z "$OPERATOR_TOKEN" ]; then
    echo "[WARNING]  Tokens not ready yet. You may need to run 'bun run k8s:token' later."
else
    echo "[OK] Service account tokens generated"
fi
echo ""

# Step 4: CRD Information
echo "-> Custom Resource Definitions (CRDs)"
echo "  CRDs will be automatically created when the operator starts"
echo "  with ENABLE_CRD_REFLECTION=true (default)"
echo ""
echo "  The operator will create:"
echo "  • MinecraftServer CRD"
echo "  • ReverseProxyServer CRD"
echo ""

# Step 5: Configuration
echo "╔════════════════════════════════════════════════╗"
echo "║              Installation Complete             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Kubernetes resources created:"
echo "  [OK] Namespace: $NAMESPACE"
echo "  [OK] Service Accounts: minikura-dev, minikura-operator"
echo "  [OK] RBAC: ClusterRoles and ClusterRoleBindings"
echo "  [OK] Tokens: Ready for authentication"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables (.env):"
echo "   KUBERNETES_NAMESPACE=\"$NAMESPACE\""
echo "   KUBERNETES_SKIP_TLS_VERIFY=\"true\"  # For local dev only"
echo "   KUBERNETES_SERVICE_ACCOUNT_TOKEN=\"<token>\""
echo ""
echo "   To get the token automatically:"
echo "   $ bun run k8s:token"
echo ""
echo "2. Start the operator:"
echo "   $ bun run k8s:dev"
echo ""
echo "   The operator will automatically:"
echo "   - Create CRDs (MinecraftServer, ReverseProxyServer)"
echo "   - Sync database state to Kubernetes"
echo "   - Watch for changes and update resources"
echo ""
echo "3. Start the backend:"
echo "   $ bun run dev"
echo ""
echo "For production deployment, see docs/DEPLOYMENT.md"
echo ""
