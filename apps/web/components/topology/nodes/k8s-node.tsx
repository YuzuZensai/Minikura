import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Box, Cpu, HardDrive, Network, Server as ServerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { K8sNodeMetadata, TopologyNodeData } from "@/lib/topology-types";

export function K8sNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as TopologyNodeData;
  const metadata = nodeData.metadata as K8sNodeMetadata;
  const { node, podCount, serverPods, proxyPods, health, metrics } = metadata;

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
              <Box className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{node.name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">Kubernetes Node</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] h-5">
            {node.status}
          </Badge>
          {node.version && (
            <Badge variant="outline" className="text-[10px] h-5">
              {node.version}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] h-5">
            {node.roles}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
          <span className="text-muted-foreground">Total Pods</span>
          <span className="font-semibold text-blue-600">{podCount}</span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <ServerIcon className="h-3 w-3" /> Server Pods
            </span>
            <span className="font-medium">{serverPods.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Network className="h-3 w-3" /> Proxy Pods
            </span>
            <span className="font-medium">{proxyPods.length}</span>
          </div>
        </div>

        {metrics && (metrics.cpuUsage || metrics.memoryUsage) && (
          <div className="space-y-1 text-[11px] pt-1 border-t">
            {metrics.cpuUsage && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> CPU
                </span>
                <span className="font-semibold text-xs text-blue-600">{metrics.cpuUsage}</span>
              </div>
            )}
            {metrics.memoryUsage && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <HardDrive className="h-3 w-3" /> Memory
                </span>
                <span className="font-semibold text-xs text-blue-600">{metrics.memoryUsage}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 text-[11px] pt-1 border-t">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Age</span>
            <span className="font-medium">{node.age}</span>
          </div>
          {node.hostname && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hostname</span>
              <span className="font-medium font-mono text-[10px] truncate">{node.hostname}</span>
            </div>
          )}
        </div>

        {(node.internalIP || node.externalIP) && (
          <div className="space-y-1 text-[11px] pt-1 border-t">
            {node.internalIP && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Internal IP</span>
                <span className="font-mono text-[10px] font-medium">{node.internalIP}</span>
              </div>
            )}
            {node.externalIP && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">External IP</span>
                <span className="font-mono text-[10px] font-medium">{node.externalIP}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  );
}
