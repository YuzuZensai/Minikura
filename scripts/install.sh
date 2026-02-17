#!/bin/bash
# Minikura Installer

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
    echo "[WARN] kubectl not found. Skipping k8s setup."
    echo "[INFO] Install kubectl and run 'bash scripts/install.sh' manually when ready."
    exit 0
fi

if ! kubectl cluster-info &> /dev/null; then
    echo "[WARN] Cannot connect to Kubernetes cluster. Skipping k8s setup."
    echo "[INFO] Run 'bash scripts/install.sh' manually when cluster is ready."
    exit 0
fi

echo "[OK] kubectl found"
echo "[OK] Connected to Kubernetes cluster"
echo ""

# Create namespace
echo "-> Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
echo ""

# Apply RBAC (single SA for both backend and operator)
echo "-> Setting up RBAC (minikura-operator ServiceAccount)"
kubectl apply -f "$PROJECT_ROOT/k8s/rbac/operator-rbac.yaml"
echo "[OK] RBAC configured"
echo ""

# CRD info
echo "-> Custom Resource Definitions"
echo "  CRDs are auto-created when the operator starts (ENABLE_CRD_REFLECTION=true)"
echo ""

echo "╔════════════════════════════════════════════════╗"
echo "║              Installation Complete             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Resources created:"
echo "  [OK] Namespace: $NAMESPACE"
echo "  [OK] ServiceAccount: minikura-operator"
echo "  [OK] ClusterRole + ClusterRoleBinding"
echo ""
echo "Next steps:"
echo "  bun run dev      - Start backend + web"
echo "  bun run k8s:dev  - Start K8s operator"
echo ""
