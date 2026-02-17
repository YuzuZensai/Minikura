#!/bin/bash
set -e

echo "=============================================="
echo "  Minikura Development Environment Setup"
echo "=============================================="

# Start Docker
echo "==> Starting Docker..."
sudo service docker start
sleep 2
sudo chmod 666 /var/run/docker.sock

# Install and start k3s via install script (sets up systemd service)
echo "==> Installing k3s..."
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --disable traefik" sh -

# Wait for k3s to be ready
echo "==> Waiting for k3s..."
sleep 5

# Configure kubectl
echo "==> Configuring kubectl..."
mkdir -p /home/dev/.kube
until [ -f /etc/rancher/k3s/k3s.yaml ]; do sleep 1; done
sudo cp /etc/rancher/k3s/k3s.yaml /home/dev/.kube/config
sudo chown dev:dev /home/dev/.kube/config
chmod 600 /home/dev/.kube/config

# Allow k3s self-signed certs
kubectl config set-cluster default --insecure-skip-tls-verify=true

# Wait for k3s API server to be fully ready
echo "==> Waiting for k3s API server..."
for i in {1..60}; do
    kubectl get nodes --request-timeout=2s >/dev/null 2>&1 && break
    echo "  Attempt $i/60..."
    sleep 1
done
sleep 2  # Extra buffer for stability

# Verify k3s is actually working
echo "==> Verifying k3s..."
kubectl get nodes || { echo "[ERROR] k3s not responding properly"; exit 1; }

# Wait for node to be Ready
echo "==> Waiting for node to be Ready..."
for i in {1..30}; do
    kubectl get nodes 2>/dev/null | grep -q " Ready" && break
    sleep 2
done

# Create namespace
echo "==> Creating minikura namespace..."
kubectl create namespace minikura --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true

# Install dependencies
echo "==> Installing dependencies..."
cd /workspace
sudo rm -rf node_modules apps/*/node_modules packages/*/node_modules 2>/dev/null || true
sudo chown -R dev:dev /workspace
bun install

# Setup database
echo "==> Setting up database..."
bun run db:generate
bun run db:push

echo ""
echo "=============================================="
echo "  Ready! Commands:"
echo "    bun run dev      - Start backend + web"
echo "    bun run k8s:dev  - Start K8s operator"
echo "    kubectl get nodes"
echo "=============================================="
