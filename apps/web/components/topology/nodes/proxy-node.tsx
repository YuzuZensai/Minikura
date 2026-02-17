import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Box, Check, Copy, Cpu, Globe, HardDrive, Network } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ProxyMetadata, TopologyNodeData } from "@/lib/topology-types";

export function ProxyNode({ data, selected }: NodeProps) {
  const nodeData = data as TopologyNodeData | TopologyNodeData;
  const metadata = nodeData.metadata as ProxyMetadata | ProxyMetadata;
  const { proxy, readyPods, podCount, health, connectedServers } = metadata;

  const k8sNodes = "k8sNodes" in metadata ? metadata.k8sNodes : [];
  const connectionInfo = "connectionInfo" in metadata ? metadata.connectionInfo : null;
  const metrics = "metrics" in metadata ? metadata.metrics : undefined;

  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectionInfo?.connectionString) {
      await navigator.clipboard.writeText(connectionInfo.connectionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = () => {
    switch (health) {
      case "healthy":
        return <Badge className="bg-green-500 hover:bg-green-600 text-xs">Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">Degraded</Badge>;
      case "unhealthy":
        return <Badge className="bg-red-500 hover:bg-red-600 text-xs">Unhealthy</Badge>;
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-md hover:shadow-lg transition-all w-[300px]",
        selected && "ring-2 ring-primary ring-offset-2 shadow-xl"
      )}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />

      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="rounded-md bg-blue-500/10 p-1.5">
              <Globe className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{proxy.id}</p>
              {proxy.description && (
                <p className="text-xs text-muted-foreground truncate">{proxy.description}</p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] h-5">
            {proxy.type}
          </Badge>
          {connectionInfo && (
            <Badge variant="outline" className="text-[10px] h-5">
              {connectionInfo.type}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
          <span className="text-muted-foreground">Pods</span>
          <span
            className={cn(
              "font-semibold",
              readyPods === podCount ? "text-green-600" : "text-yellow-600"
            )}
          >
            {readyPods}/{podCount}
          </span>
        </div>

        {proxy.node_port && (
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Network className="h-3 w-3" /> NodePort
              </span>
              <span className="font-medium">{proxy.node_port}</span>
            </div>
          </div>
        )}

        {connectionInfo?.connectionString && (
          <div className="space-y-1 text-[11px] pt-1 border-t">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Address</span>
            </div>
            <div className="flex items-center gap-1">
              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono flex-1 truncate">
                {connectionInfo.connectionString}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy address"}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            {connectionInfo.note && (
              <p className="text-[10px] text-muted-foreground italic">{connectionInfo.note}</p>
            )}
          </div>
        )}

        <div className="space-y-1 text-[11px] pt-1 border-t">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <HardDrive className="h-3 w-3" /> Memory
            </span>
            <span className="font-medium text-xs">
              {metrics?.memoryUsage && (
                <span className="text-blue-600">{metrics.memoryUsage} / </span>
              )}
              <span className="text-muted-foreground">{proxy.memory}MB</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Cpu className="h-3 w-3" /> CPU
            </span>
            <span className="font-medium text-xs">
              {metrics?.cpuUsage && <span className="text-blue-600">{metrics.cpuUsage} / </span>}
              <span className="text-muted-foreground">
                {proxy.cpu_request || "N/A"}/{proxy.cpu_limit || "N/A"}
              </span>
            </span>
          </div>
        </div>

        {"pods" in metadata && metadata.pods && metadata.pods.length > 0 && (
          <div className="space-y-1 text-[11px] pt-1 border-t">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Restarts</span>
              <span
                className={cn(
                  "font-medium",
                  metadata.pods.reduce((sum, p) => sum + (p.restarts || 0), 0) > 0
                    ? "text-yellow-600"
                    : "text-green-600"
                )}
              >
                {metadata.pods.reduce((sum, p) => sum + (p.restarts || 0), 0)}
              </span>
            </div>
            {metadata.pods[0]?.age && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Age</span>
                <span className="font-medium">{metadata.pods[0].age}</span>
              </div>
            )}
            {metadata.pods[0]?.ip && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pod IP</span>
                <span className="font-medium font-mono text-[10px]">{metadata.pods[0].ip}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Routing To</span>
              <span className="font-semibold text-blue-600">{connectedServers.length} servers</span>
            </div>
            {k8sNodes.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Box className="h-3 w-3" /> K8s Node
                </span>
                <span className="font-medium">{k8sNodes[0]}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  );
}
