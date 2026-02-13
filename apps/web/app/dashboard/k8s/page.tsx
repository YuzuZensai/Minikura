"use client";

import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import type {
  CustomResourceSummary,
  DeploymentInfo,
  K8sConfigMapSummary,
  K8sServiceSummary,
  K8sStatus,
  PodInfo,
  StatefulSetInfo,
} from "@minikura/api";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

export default function K8sResourcesPage() {
  const [status, setStatus] = useState<K8sStatus | null>(null);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [statefulSets, setStatefulSets] = useState<StatefulSetInfo[]>([]);
  const [services, setServices] = useState<K8sServiceSummary[]>([]);
  const [configMaps, setConfigMaps] = useState<K8sConfigMapSummary[]>([]);
  const [minecraftServers, setMinecraftServers] = useState<CustomResourceSummary[]>([]);
  const [reverseProxyServers, setReverseProxyServers] = useState<CustomResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        statusRes,
        podsRes,
        deploymentsRes,
        statefulSetsRes,
        servicesRes,
        configMapsRes,
        minecraftServersRes,
        reverseProxyServersRes,
      ] = await Promise.allSettled([
        api.api.k8s.status.get(),
        api.api.k8s.pods.get(),
        api.api.k8s.deployments.get(),
        api.api.k8s.statefulsets.get(),
        api.api.k8s.services.get(),
        api.api.k8s.configmaps.get(),
        api.api.k8s["minecraft-servers"].get(),
        api.api.k8s["reverse-proxy-servers"].get(),
      ]);

      if (statusRes.status === "fulfilled" && statusRes.value.data) {
        setStatus(statusRes.value.data as K8sStatus);
      } else if (statusRes.status === "rejected") {
        console.error("Failed to fetch status:", statusRes.reason);
      }

      if (podsRes.status === "fulfilled" && podsRes.value.data) {
        setPods(podsRes.value.data as PodInfo[]);
      } else if (podsRes.status === "rejected") {
        console.error("Failed to fetch pods:", podsRes.reason);
      }

      if (deploymentsRes.status === "fulfilled" && deploymentsRes.value.data) {
        setDeployments(deploymentsRes.value.data as DeploymentInfo[]);
      } else if (deploymentsRes.status === "rejected") {
        console.error("Failed to fetch deployments:", deploymentsRes.reason);
      }

      if (statefulSetsRes.status === "fulfilled" && statefulSetsRes.value.data) {
        setStatefulSets(statefulSetsRes.value.data as StatefulSetInfo[]);
      } else if (statefulSetsRes.status === "rejected") {
        console.error("Failed to fetch statefulsets:", statefulSetsRes.reason);
      }

      if (servicesRes.status === "fulfilled" && servicesRes.value.data) {
        setServices(servicesRes.value.data as K8sServiceSummary[]);
      } else if (servicesRes.status === "rejected") {
        console.error("Failed to fetch services:", servicesRes.reason);
      }

      if (configMapsRes.status === "fulfilled" && configMapsRes.value.data) {
        setConfigMaps(configMapsRes.value.data as K8sConfigMapSummary[]);
      } else if (configMapsRes.status === "rejected") {
        console.error("Failed to fetch configmaps:", configMapsRes.reason);
      }

      if (minecraftServersRes.status === "fulfilled" && minecraftServersRes.value.data) {
        setMinecraftServers(minecraftServersRes.value.data as CustomResourceSummary[]);
      } else if (minecraftServersRes.status === "rejected") {
        console.error("Failed to fetch minecraft servers:", minecraftServersRes.reason);
      }

      if (reverseProxyServersRes.status === "fulfilled" && reverseProxyServersRes.value.data) {
        setReverseProxyServers(reverseProxyServersRes.value.data as CustomResourceSummary[]);
      } else if (reverseProxyServersRes.status === "rejected") {
        console.error("Failed to fetch reverse proxy servers:", reverseProxyServersRes.reason);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch Kubernetes resources";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchData intentionally omitted to avoid infinite loop
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (phase: string) => {
    const variants: Record<
      string,
      {
        icon: React.ComponentType<{ className?: string }>;
        variant: "default" | "destructive" | "secondary";
      }
    > = {
      Running: { icon: CheckCircle2, variant: "default" },
      Succeeded: { icon: CheckCircle2, variant: "default" },
      Failed: { icon: XCircle, variant: "destructive" },
      Pending: { icon: AlertCircle, variant: "secondary" },
      Unknown: { icon: AlertCircle, variant: "secondary" },
    };

    const status = variants[phase] || variants.Unknown;
    const Icon = status.icon;

    return (
      <Badge variant={status.variant}>
        <Icon className="mr-1 h-3 w-3" />
        {phase}
      </Badge>
    );
  };

  if (loading && !status) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kubernetes Resources</h1>
          <p className="text-muted-foreground">View and monitor your Kubernetes resources</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kubernetes Resources</h1>
          <p className="text-muted-foreground">View and monitor your Kubernetes resources</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status?.initialized) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kubernetes Resources</h1>
          <p className="text-muted-foreground">View and monitor your Kubernetes resources</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Kubernetes Not Connected
            </CardTitle>
            <CardDescription>
              The Kubernetes client is not initialized. Please ensure the operator is running with
              proper Kubernetes configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set{" "}
              <code className="bg-muted px-1 py-0.5 rounded">KUBERNETES_SKIP_TLS_VERIFY=true</code>{" "}
              if using self-signed certificates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kubernetes Resources</h1>
        <p className="text-muted-foreground">View and monitor your Kubernetes resources</p>
      </div>

      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <span className="text-sm font-medium">Connected to Kubernetes</span>
      </div>

      <Tabs defaultValue="pods" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pods">Pods ({pods.length})</TabsTrigger>
          <TabsTrigger value="deployments">Deployments ({deployments.length})</TabsTrigger>
          <TabsTrigger value="statefulsets">StatefulSets ({statefulSets.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="configmaps">ConfigMaps ({configMaps.length})</TabsTrigger>
          <TabsTrigger value="minecraft">Minecraft Servers ({minecraftServers.length})</TabsTrigger>
          <TabsTrigger value="reverseproxy">
            Reverse Proxies ({reverseProxyServers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pods</CardTitle>
              <CardDescription>Running pods in the minikura namespace</CardDescription>
            </CardHeader>
            <CardContent>
              {pods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pods found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ready</TableHead>
                        <TableHead>Restarts</TableHead>
                        <TableHead>Node</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pods.map((pod) => (
                        <TableRow key={pod.name}>
                          <TableCell className="font-medium">{pod.name}</TableCell>
                          <TableCell>{getStatusBadge(pod.status)}</TableCell>
                          <TableCell>{pod.ready}</TableCell>
                          <TableCell>{pod.restarts}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {pod.nodeName || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{pod.age}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployments</CardTitle>
              <CardDescription>Deployments in the minikura namespace</CardDescription>
            </CardHeader>
            <CardContent>
              {deployments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deployments found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Ready</TableHead>
                        <TableHead>Up-to-date</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deployments.map((deployment) => (
                        <TableRow key={deployment.name}>
                          <TableCell className="font-medium">{deployment.name}</TableCell>
                          <TableCell>{deployment.ready}</TableCell>
                          <TableCell>{deployment.upToDate ?? deployment.updated}</TableCell>
                          <TableCell>{deployment.available ?? 0}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {deployment.age}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statefulsets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>StatefulSets</CardTitle>
              <CardDescription>StatefulSets in the minikura namespace</CardDescription>
            </CardHeader>
            <CardContent>
              {statefulSets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No statefulsets found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Ready</TableHead>
                        <TableHead>Desired</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statefulSets.map((statefulSet) => (
                        <TableRow key={statefulSet.name}>
                          <TableCell className="font-medium">{statefulSet.name}</TableCell>
                          <TableCell>{statefulSet.ready}</TableCell>
                          <TableCell>{statefulSet.desired}</TableCell>
                          <TableCell>{statefulSet.current}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {statefulSet.age}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
              <CardDescription>Services in the minikura namespace</CardDescription>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cluster IP</TableHead>
                        <TableHead>External IP</TableHead>
                        <TableHead>Ports</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.name}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{service.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {service.clusterIP}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {service.externalIP}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {service.ports}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {service.age}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configmaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ConfigMaps</CardTitle>
              <CardDescription>ConfigMaps in the minikura namespace</CardDescription>
            </CardHeader>
            <CardContent>
              {configMaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No configmaps found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Data Keys</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configMaps.map((cm) => (
                        <TableRow key={cm.name}>
                          <TableCell className="font-medium">{cm.name}</TableCell>
                          <TableCell>{cm.data}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cm.age}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minecraft" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Minecraft Servers</CardTitle>
              <CardDescription>Custom Minecraft server resources</CardDescription>
            </CardHeader>
            <CardContent>
              {minecraftServers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Minecraft servers found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minecraftServers.map((server) => (
                        <TableRow key={server.name}>
                          <TableCell className="font-medium">{server.name}</TableCell>
                          <TableCell>
                            {server.status?.phase ? (
                              getStatusBadge(server.status.phase)
                            ) : (
                              <Badge variant="secondary">Unknown</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {server.age}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reverseproxy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reverse Proxy Servers</CardTitle>
              <CardDescription>Custom reverse proxy server resources</CardDescription>
            </CardHeader>
            <CardContent>
              {reverseProxyServers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reverse proxy servers found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reverseProxyServers.map((server) => (
                        <TableRow key={server.name}>
                          <TableCell className="font-medium">{server.name}</TableCell>
                          <TableCell>
                            {server.status?.phase ? (
                              getStatusBadge(server.status.phase)
                            ) : (
                              <Badge variant="secondary">Unknown</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {server.age}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
