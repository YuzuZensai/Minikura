"use client";

import { Network, RefreshCw } from "lucide-react";
import { TopologyCanvas } from "@/components/topology/topology-canvas";
import { useTopologyData } from "@/hooks/use-topology-data";

export default function TopologyPage() {
  const { graph, loading, error } = useTopologyData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Network Topology</h1>
          <p className="text-muted-foreground mt-1">
            Real-time server infrastructure, proxy connections, and Kubernetes nodes
          </p>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-250px)]">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading topology...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Network Topology</h1>
          <p className="text-muted-foreground mt-1">
            Real-time server infrastructure, proxy connections, and Kubernetes nodes
          </p>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-250px)] border-2 border-dashed rounded-lg">
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <p className="text-destructive font-semibold">Error loading topology</p>
            <p className="text-muted-foreground text-sm">{error}</p>
            <p className="text-muted-foreground text-xs mt-2">Auto-retrying...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Network Topology</h1>
          <p className="text-muted-foreground mt-1">
            Real-time server infrastructure, proxy connections, and Kubernetes nodes
          </p>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-250px)] border-2 border-dashed rounded-lg">
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <p className="text-muted-foreground">No servers or infrastructure found</p>
            <p className="text-sm text-muted-foreground">
              Create a server to see it appear in the topology
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Network className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Network Topology</h1>
            <p className="text-muted-foreground mt-1">
              Real-time server infrastructure, proxy connections, and Kubernetes nodes
            </p>
          </div>
        </div>
      </div>

      <TopologyCanvas graph={graph} />
    </div>
  );
}
