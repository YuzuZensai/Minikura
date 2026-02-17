"use client";

import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";
import { useGraphLayout } from "@/hooks/use-graph-layout";
import type { TopologyFilters, TopologyGraph, TopologyNodeData } from "@/lib/topology-types";
import { filterEdges, filterNodes } from "@/lib/topology-utils";
import { NodeDetailsPanel } from "./controls/node-details-panel";
import { TopologyToolbar } from "./controls/topology-toolbar";
import { nodeTypes } from "./nodes/node-types";

interface TopologyCanvasProps {
  graph: TopologyGraph;
}

export function TopologyCanvas({ graph }: TopologyCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);
  const [filters, setFilters] = useState<TopologyFilters>({
    showServers: true,
    showProxies: true,
    showK8sNodes: true,
    showConnections: true,
    searchQuery: "",
  });

  const filteredNodes = useMemo(() => {
    return filterNodes(graph.nodes, filters);
  }, [graph.nodes, filters]);

  const filteredEdges = useMemo(() => {
    if (!filters.showConnections) return [];
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
    return filterEdges(graph.edges, visibleNodeIds);
  }, [graph.edges, filteredNodes, filters.showConnections]);

  const { nodes, edges } = useGraphLayout({
    nodes: filteredNodes,
    edges: filteredEdges,
  });

  const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    setSelectedNode(node.data as TopologyNodeData);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="h-[calc(100vh-250px)] w-full rounded-lg border bg-background shadow-xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          animated: false,
          type: "smoothstep",
          style: {
            stroke: "#9ca3af",
            strokeWidth: 2,
            strokeDasharray: "5 5",
          },
          markerEnd: {
            type: "arrowclosed",
            color: "#9ca3af",
            width: 20,
            height: 20,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={24} size={1} />
        <Controls
          showZoom
          showFitView
          showInteractive
          className="bg-white/80 backdrop-blur-sm border shadow-lg"
        />
        <MiniMap
          nodeColor={(node: any) => {
            const data = node.data as TopologyNodeData;
            const colors = {
              healthy: "#22c55e",
              degraded: "#eab308",
              unhealthy: "#ef4444",
              unknown: "#94a3b8",
            };
            return colors[data.status] || "#94a3b8";
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
          className="bg-white/80 backdrop-blur-sm border shadow-lg"
        />

        <Panel position="top-left">
          <div className="m-2">
            <TopologyToolbar
              filters={filters}
              onFiltersChange={setFilters}
              metadata={graph.metadata}
            />
          </div>
        </Panel>
      </ReactFlow>

      <NodeDetailsPanel
        node={selectedNode}
        open={selectedNode !== null}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
