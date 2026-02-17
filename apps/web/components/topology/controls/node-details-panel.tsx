"use client";

import { Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  K8sNodeMetadata,
  ProxyMetadata,
  ServerMetadata,
  TopologyNodeData,
} from "@/lib/topology-types";

interface NodeDetailsPanelProps {
  node: TopologyNodeData | null;
  open: boolean;
  onClose: () => void;
}

export function NodeDetailsPanel({
  node,
  open,
  onClose,
}: NodeDetailsPanelProps) {
  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[600px] lg:w-[700px] overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle>{node.label}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pr-2">
          {/* Type and Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {node.type === "server"
                  ? "Minecraft Server"
                  : node.type === "proxy"
                    ? "Reverse Proxy"
                    : "Kubernetes Node"}
              </Badge>
              <Badge
                variant={
                  node.status === "healthy"
                    ? "default"
                    : node.status === "degraded"
                      ? "secondary"
                      : "destructive"
                }
              >
                {node.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {node.type === "server" && (
            <ServerDetails metadata={node.metadata as ServerMetadata} />
          )}
          {node.type === "proxy" && (
            <ProxyDetails metadata={node.metadata as ProxyMetadata} />
          )}
          {node.type === "k8s-node" && (
            <K8sNodeDetails metadata={node.metadata as K8sNodeMetadata} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ServerDetails({ metadata }: { metadata: ServerMetadata }) {
  const { server, podCount, readyPods, pods, k8sNodes, connectedProxies } =
    metadata;

  return (
    <div className="space-y-4">
      <DetailSection title="Server Configuration">
        <DetailItem label="ID" value={server.id} />
        {server.description && (
          <DetailItem label="Description" value={server.description} />
        )}
        <DetailItem label="Type" value={server.type} />
        <DetailItem label="Jar Type" value={server.jar_type} />
        <DetailItem
          label="Minecraft Version"
          value={server.minecraft_version}
        />
        <DetailItem label="Port" value={server.listen_port.toString()} />
      </DetailSection>

      <DetailSection title="Kubernetes Info">
        <DetailItem label="Pods" value={`${readyPods}/${podCount} Ready`} />
        {k8sNodes.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Running on {k8sNodes.length} K8s node(s):
              </span>
            </div>
            {k8sNodes.map((nodeName) => (
              <div
                key={nodeName}
                className="text-sm p-2 bg-blue-50 border border-blue-200 rounded ml-6"
              >
                <span className="font-mono text-xs break-all">{nodeName}</span>
              </div>
            ))}
          </div>
        )}
        {pods.map((pod) => (
          <div key={pod.name} className="text-sm mt-2 p-2 bg-muted rounded">
            <div className="font-medium font-mono text-xs break-all">
              {pod.name}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              <div>
                Status: {pod.status} • {pod.ready}
              </div>
              <div>Restarts: {pod.restarts}</div>
              {pod.nodeName && (
                <div className="flex items-center gap-1">
                  <Box className="h-3 w-3 shrink-0" />
                  <span className="break-all">Node: {pod.nodeName}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </DetailSection>

      {connectedProxies.length > 0 && (
        <DetailSection title="Proxy Connections">
          <DetailItem
            label="Behind Proxies"
            value={connectedProxies.length.toString()}
          />
          <div className="mt-2 space-y-1">
            {connectedProxies.map((proxyId) => (
              <div
                key={proxyId}
                className="text-sm p-2 bg-blue-50 border border-blue-200 rounded font-mono break-all"
              >
                {proxyId}
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      <DetailSection title="Resources">
        <DetailItem
          label="Memory"
          value={`${server.memory_request}MB / ${server.memory}MB`}
        />
        <DetailItem
          label="CPU Request"
          value={server.cpu_request || "Not set"}
        />
        <DetailItem label="CPU Limit" value={server.cpu_limit || "Not set"} />
      </DetailSection>
    </div>
  );
}

function ProxyDetails({ metadata }: { metadata: ProxyMetadata }) {
  const { proxy, podCount, readyPods, pods, k8sNodes, connectedServers } =
    metadata;

  return (
    <div className="space-y-4">
      <DetailSection title="Proxy Configuration">
        <DetailItem label="ID" value={proxy.id} />
        {proxy.description && (
          <DetailItem label="Description" value={proxy.description} />
        )}
        <DetailItem label="Type" value={proxy.type} />
        <DetailItem
          label="External Address"
          value={`${proxy.external_address}:${proxy.external_port}`}
        />
        <DetailItem label="Listen Port" value={proxy.listen_port.toString()} />
      </DetailSection>

      <DetailSection title="Kubernetes Info">
        <DetailItem label="Pods" value={`${readyPods}/${podCount} Ready`} />
        {k8sNodes.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Running on {k8sNodes.length} K8s node(s):
              </span>
            </div>
            {k8sNodes.map((nodeName) => (
              <div
                key={nodeName}
                className="text-sm p-2 bg-blue-50 border border-blue-200 rounded ml-6"
              >
                <span className="font-mono text-xs break-all">{nodeName}</span>
              </div>
            ))}
          </div>
        )}
        {pods.map((pod) => (
          <div key={pod.name} className="text-sm mt-2 p-2 bg-muted rounded">
            <div className="font-medium font-mono text-xs break-all">
              {pod.name}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              <div>
                Status: {pod.status} • {pod.ready}
              </div>
              <div>Restarts: {pod.restarts}</div>
              {pod.nodeName && (
                <div className="flex items-center gap-1">
                  <Box className="h-3 w-3 shrink-0" />
                  <span className="break-all">Node: {pod.nodeName}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </DetailSection>

      <DetailSection title="Connected Servers">
        <DetailItem label="Total" value={connectedServers.length.toString()} />
        {connectedServers.length > 0 && (
          <div className="mt-2 space-y-1">
            {connectedServers.map((serverId) => (
              <div
                key={serverId}
                className="text-sm p-2 bg-green-50 border border-green-200 rounded font-mono break-all"
              >
                {serverId}
              </div>
            ))}
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function K8sNodeDetails({ metadata }: { metadata: K8sNodeMetadata }) {
  const { node, podCount, serverPods, proxyPods } = metadata;

  return (
    <div className="space-y-4">
      <DetailSection title="Node Information">
        <DetailItem label="Name" value={node.name || "Unknown"} />
        <DetailItem label="Status" value={node.status} />
        {node.version && <DetailItem label="Version" value={node.version} />}
        {node.internalIP && (
          <DetailItem label="Internal IP" value={node.internalIP} />
        )}
        {node.externalIP && (
          <DetailItem label="External IP" value={node.externalIP} />
        )}
      </DetailSection>

      <DetailSection title="Node Details">
        <DetailItem label="Roles" value={node.roles} />
        <DetailItem label="Age" value={node.age} />
        {node.hostname && <DetailItem label="Hostname" value={node.hostname} />}
      </DetailSection>

      <DetailSection title="Running Pods">
        <DetailItem label="Total Pods" value={podCount.toString()} />
        <DetailItem label="Server Pods" value={serverPods.length.toString()} />
        <DetailItem label="Proxy Pods" value={proxyPods.length.toString()} />

        {serverPods.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium mb-2">Server Pods:</p>
            <div className="space-y-1">
              {serverPods.map((podName) => (
                <div
                  key={podName}
                  className="text-xs p-2 bg-green-50 border border-green-200 rounded font-mono break-all"
                >
                  {podName}
                </div>
              ))}
            </div>
          </div>
        )}

        {proxyPods.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium mb-2">Proxy Pods:</p>
            <div className="space-y-1">
              {proxyPods.map((podName) => (
                <div
                  key={podName}
                  className="text-xs p-2 bg-blue-50 border border-blue-200 rounded font-mono break-all"
                >
                  {podName}
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium text-right break-words">{value}</span>
    </div>
  );
}
