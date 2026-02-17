"use client";

import { Box, Filter, Globe, Search, Server } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { TopologyFilters } from "@/lib/topology-types";

interface TopologyToolbarProps {
  filters: TopologyFilters;
  onFiltersChange: (filters: TopologyFilters) => void;
  metadata: {
    totalServers: number;
    totalProxies: number;
    totalK8sNodes: number;
    totalConnections: number;
    healthySystems: number;
    degradedSystems: number;
    unhealthySystems: number;
  };
}

export function TopologyToolbar({ filters, onFiltersChange, metadata }: TopologyToolbarProps) {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const toggleFilter = (key: keyof TopologyFilters) => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white/90 backdrop-blur-sm rounded-lg border shadow-lg min-w-[350px]">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Server className="h-3 w-3" />
            <span className="text-xs">Servers</span>
          </div>
          <span className="text-lg font-bold">{metadata.totalServers}</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Globe className="h-3 w-3" />
            <span className="text-xs">Proxies</span>
          </div>
          <span className="text-lg font-bold">{metadata.totalProxies}</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Box className="h-3 w-3" />
            <span className="text-xs">Nodes</span>
          </div>
          <span className="text-lg font-bold">{metadata.totalK8sNodes}</span>
        </div>
      </div>

      {/* Health Status */}
      <div className="flex gap-2 justify-between text-xs">
        <Badge variant="outline" className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {metadata.healthySystems} Healthy
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          {metadata.degradedSystems} Degraded
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {metadata.unhealthySystems} Down
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">Show/Hide</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-servers" className="flex items-center gap-2 cursor-pointer">
                    <Server className="h-4 w-4" />
                    <span>Servers</span>
                  </Label>
                  <Switch
                    id="show-servers"
                    checked={filters.showServers}
                    onCheckedChange={() => toggleFilter("showServers")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-proxies" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    <span>Reverse Proxies</span>
                  </Label>
                  <Switch
                    id="show-proxies"
                    checked={filters.showProxies}
                    onCheckedChange={() => toggleFilter("showProxies")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="show-k8s-nodes"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Box className="h-4 w-4" />
                    <span>K8s Nodes</span>
                  </Label>
                  <Switch
                    id="show-k8s-nodes"
                    checked={filters.showK8sNodes}
                    onCheckedChange={() => toggleFilter("showK8sNodes")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-connections" className="cursor-pointer">
                    Connection Lines
                  </Label>
                  <Switch
                    id="show-connections"
                    checked={filters.showConnections}
                    onCheckedChange={() => toggleFilter("showConnections")}
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
