"use client";

import type { ConnectionInfo, NormalServer, PodInfo, ReverseProxyServer } from "@minikura/api";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Globe,
  Pencil,
  Plus,
  Server,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { getReverseProxyApi } from "@/lib/api-helpers";

function ServerStatusCell({ serverId, type }: { serverId: string; type: "normal" | "proxy" }) {
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const endpoint =
          type === "normal"
            ? api.api.k8s.servers({ serverId }).pods.get
            : api.api.k8s["reverse-proxy"]({ serverId }).pods.get;
        const res = await endpoint();
        if (res.data) {
          setPods(res.data as PodInfo[]);
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };
    fetchPods();
  }, [serverId, type]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-3 w-3 animate-pulse bg-muted rounded-full" />
        Loading...
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        No pods
      </div>
    );
  }

  const allRunning = pods.every((pod) => pod.status === "Running");
  const readyCount = pods.filter((pod) => pod.ready === "1/1").length;

  return (
    <div className="flex items-center gap-2">
      {allRunning ? (
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      ) : (
        <AlertCircle className="h-3 w-3 text-yellow-500" />
      )}
      <span className="text-xs">
        {readyCount}/{pods.length} Ready
      </span>
    </div>
  );
}

function ConnectionInfoCell({ serverId, type }: { serverId: string; type: "normal" | "proxy" }) {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchConnectionInfo = async () => {
      try {
        const reverseProxyApi = getReverseProxyApi();
        const endpoint =
          type === "normal"
            ? api.api.servers({ id: serverId })["connection-info"]
            : reverseProxyApi({ id: serverId })["connection-info"];
        const res = await endpoint.get();
        if (res.data) {
          setConnectionInfo(res.data as ConnectionInfo);
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };
    fetchConnectionInfo();
  }, [serverId, type]);

  const handleCopy = async () => {
    if (connectionInfo?.connectionString) {
      await navigator.clipboard.writeText(connectionInfo.connectionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <span className="text-muted-foreground text-xs">Loading...</span>;
  }

  if (!connectionInfo) {
    return <span className="text-muted-foreground text-xs">N/A</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        <Badge variant="secondary" className="w-fit text-xs">
          {connectionInfo.type}
        </Badge>
        {connectionInfo.connectionString && (
          <div className="flex items-center gap-1">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {connectionInfo.connectionString}
            </code>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        {connectionInfo.note && (
          <p className="text-xs text-muted-foreground">{connectionInfo.note}</p>
        )}
      </div>
    </TooltipProvider>
  );
}

export default function ServersPage() {
  const router = useRouter();
  const [normalServers, setNormalServers] = useState<NormalServer[]>([]);
  const [reverseProxies, setReverseProxies] = useState<ReverseProxyServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "normal" | "proxy";
  } | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      const reverseProxyApi = getReverseProxyApi();
      const [normalRes, proxyRes] = await Promise.all([
        api.api.servers.get(),
        reverseProxyApi.get(),
      ]);

      if (normalRes.data) {
        setNormalServers(normalRes.data as unknown as NormalServer[]);
      }
      if (proxyRes.data) {
        setReverseProxies(proxyRes.data as unknown as ReverseProxyServer[]);
      }
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const reverseProxyApi = getReverseProxyApi();
      if (deleteTarget.type === "normal") {
        await api.api.servers({ id: deleteTarget.id }).delete();
      } else {
        await reverseProxyApi({ id: deleteTarget.id }).delete();
      }
      await fetchServers();
      setDeleteTarget(null);
    } catch (_error) {}
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Server Management</h1>
          <p className="text-muted-foreground mt-1">Manage your Minecraft servers</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Server Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Minecraft servers and reverse proxies
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/servers/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Server
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <CardTitle>Minecraft Servers</CardTitle>
          </div>
          <CardDescription>Manage your normal Minecraft server instances</CardDescription>
        </CardHeader>
        <CardContent>
          {normalServers.length === 0 ? (
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No servers created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Software</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Memory (MB)</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.id}</TableCell>
                      <TableCell>
                        <ServerStatusCell serverId={server.id} type="normal" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{server.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{server.jar_type || "VANILLA"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {server.minecraft_version || "LATEST"}
                      </TableCell>
                      <TableCell>{server.memory || 1024}</TableCell>
                      <TableCell>
                        <ConnectionInfoCell serverId={server.id} type="normal" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {server.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/servers/${server.id}/logs`)}
                            title="View Logs"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/servers/edit/${server.id}`)}
                            title="Edit Server"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: server.id, type: "normal" })}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Reverse Proxy Servers</CardTitle>
          </div>
          <CardDescription>Manage your Velocity and BungeeCord proxy servers</CardDescription>
        </CardHeader>
        <CardContent>
          {reverseProxies.length === 0 ? (
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No reverse proxies created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>External</TableHead>
                    <TableHead>Listen Port</TableHead>
                    <TableHead>Memory (MB)</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reverseProxies.map((proxy) => (
                    <TableRow key={proxy.id}>
                      <TableCell className="font-medium">{proxy.id}</TableCell>
                      <TableCell>
                        <ServerStatusCell serverId={proxy.id} type="proxy" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{proxy.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {proxy.external_address}:{proxy.external_port}
                      </TableCell>
                      <TableCell>{proxy.listen_port}</TableCell>
                      <TableCell>{proxy.memory}</TableCell>
                      <TableCell>
                        <ConnectionInfoCell serverId={proxy.id} type="proxy" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {proxy.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/servers/${proxy.id}/logs`)}
                            title="View Logs"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/servers/edit/${proxy.id}`)}
                            title="Edit Server"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: proxy.id, type: "proxy" })}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Server</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this{" "}
              {deleteTarget?.type === "normal" ? "server" : "reverse proxy"}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
