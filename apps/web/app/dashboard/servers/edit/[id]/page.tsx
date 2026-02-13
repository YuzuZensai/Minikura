"use client";

import type { NormalServer, UpdateServerRequest } from "@minikura/api";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServerForm, type ServerFormData, type ServerType } from "@/components/server-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getReverseProxyApi } from "@/lib/api-helpers";

export default function EditServerPage() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [serverData, setServerData] = useState<NormalServer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServer = async () => {
      try {
        setLoading(true);

        const normalResponse = await api.api.servers.get();
        if (normalResponse.data) {
          const servers = normalResponse.data as unknown as NormalServer[];
          const server = servers.find((s) => s.id === serverId);
          if (server) {
            setServerData(server);
            setLoading(false);
            return;
          }
        }

        const proxyResponse = await getReverseProxyApi().get();
        if (proxyResponse.data) {
          const proxies = proxyResponse.data as unknown as NormalServer[];
          const proxy = proxies.find((p) => p.id === serverId);
          if (proxy) {
            setServerData(proxy);
            setLoading(false);
            return;
          }
        }

        setError("Server not found");
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch server:", err);
        setError("Failed to load server data");
        setLoading(false);
      }
    };

    if (serverId) {
      fetchServer();
    }
  }, [serverId]);

  const toServiceType = (value?: string | null): ServerFormData["serviceType"] => {
    if (value === "NODE_PORT" || value === "LOAD_BALANCER") {
      return value;
    }
    return "CLUSTER_IP";
  };

  const toDifficulty = (value?: string | null): ServerFormData["difficulty"] => {
    if (value === "peaceful" || value === "easy" || value === "normal" || value === "hard") {
      return value;
    }
    return "easy";
  };

  const toMode = (value?: string | null): ServerFormData["mode"] => {
    if (value === "creative" || value === "adventure" || value === "spectator") {
      return value;
    }
    return "survival";
  };

  const toServerType = (value?: string | null): ServerType => {
    if (value === "VANILLA" || value === "CUSTOM") {
      return value;
    }
    return "PAPER";
  };

  const parseEnvVariables = (envVars?: Array<{ key: string; value: string }>) => {
    if (!envVars) return {};

    const parsed: Record<string, string> = {};
    for (const { key, value } of envVars) {
      parsed[key] = value;
    }
    return parsed;
  };

  const handleSubmit = async (data: ServerFormData) => {
    if (!serverData) return;

    const filteredEnvVars = data.envVars.filter((ev) => ev.key && ev.value);

    const envVariables: Record<string, string> = {};
    if (data.allowFlight) envVariables.ALLOW_FLIGHT = String(data.allowFlight);
    if (data.enableCommandBlock)
      envVariables.ENABLE_COMMAND_BLOCK = String(data.enableCommandBlock);
    if (data.spawnProtection) envVariables.SPAWN_PROTECTION = data.spawnProtection;
    if (data.viewDistance) envVariables.VIEW_DISTANCE = data.viewDistance;
    if (data.simulationDistance) envVariables.SIMULATION_DISTANCE = data.simulationDistance;

    if (data.levelSeed) envVariables.SEED = data.levelSeed;
    if (data.levelType) envVariables.LEVEL_TYPE = data.levelType;
    if (data.generatorSettings) envVariables.GENERATOR_SETTINGS = data.generatorSettings;
    if (data.hardcore) envVariables.HARDCORE = String(data.hardcore);
    if (data.spawnAnimals !== undefined) envVariables.SPAWN_ANIMALS = String(data.spawnAnimals);
    if (data.spawnMonsters !== undefined) envVariables.SPAWN_MONSTERS = String(data.spawnMonsters);
    if (data.spawnNpcs !== undefined) envVariables.SPAWN_NPCS = String(data.spawnNpcs);

    if (data.enableWhitelist) envVariables.ENABLE_WHITELIST = String(data.enableWhitelist);
    if (data.whitelist) envVariables.WHITELIST = data.whitelist;
    if (data.whitelistFile) envVariables.WHITELIST_FILE = data.whitelistFile;
    if (data.ops) envVariables.OPS = data.ops;
    if (data.opsFile) envVariables.OPS_FILE = data.opsFile;

    if (data.jvmXxOpts) envVariables.JVM_XX_OPTS = data.jvmXxOpts;
    if (data.jvmDdOpts) envVariables.JVM_DD_OPTS = data.jvmDdOpts;
    if (data.enableJmx) envVariables.ENABLE_JMX = String(data.enableJmx);

    if (data.resourcePack) envVariables.RESOURCE_PACK = data.resourcePack;
    if (data.resourcePackSha1) envVariables.RESOURCE_PACK_SHA1 = data.resourcePackSha1;
    if (data.resourcePackEnforce)
      envVariables.RESOURCE_PACK_ENFORCE = String(data.resourcePackEnforce);

    if (data.enableRcon !== undefined) envVariables.ENABLE_RCON = String(data.enableRcon);
    if (data.rconPassword) envVariables.RCON_PASSWORD = data.rconPassword;
    if (data.rconPort) envVariables.RCON_PORT = data.rconPort;
    if (data.rconCmdsStartup) envVariables.RCON_CMDS_STARTUP = data.rconCmdsStartup;
    if (data.rconCmdsOnConnect) envVariables.RCON_CMDS_ON_CONNECT = data.rconCmdsOnConnect;
    if (data.rconCmdsFirstConnect) envVariables.RCON_CMDS_FIRST_CONNECT = data.rconCmdsFirstConnect;
    if (data.rconCmdsOnDisconnect) envVariables.RCON_CMDS_ON_DISCONNECT = data.rconCmdsOnDisconnect;
    if (data.rconCmdsLastDisconnect)
      envVariables.RCON_CMDS_LAST_DISCONNECT = data.rconCmdsLastDisconnect;

    if (data.enableQuery !== undefined) envVariables.ENABLE_QUERY = String(data.enableQuery);
    if (data.queryPort) envVariables.QUERY_PORT = data.queryPort;

    if (data.enableAutopause) envVariables.ENABLE_AUTOPAUSE = String(data.enableAutopause);
    if (data.autopauseTimeoutEst) envVariables.AUTOPAUSE_TIMEOUT_EST = data.autopauseTimeoutEst;
    if (data.autopauseTimeoutInit) envVariables.AUTOPAUSE_TIMEOUT_INIT = data.autopauseTimeoutInit;
    if (data.autopauseTimeoutKn) envVariables.AUTOPAUSE_TIMEOUT_KN = data.autopauseTimeoutKn;
    if (data.autopausePeriod) envVariables.AUTOPAUSE_PERIOD = data.autopausePeriod;
    if (data.autopauseKnockInterface)
      envVariables.AUTOPAUSE_KNOCK_INTERFACE = data.autopauseKnockInterface;

    if (data.enableAutostop) envVariables.ENABLE_AUTOSTOP = String(data.enableAutostop);
    if (data.autostopTimeoutEst) envVariables.AUTOSTOP_TIMEOUT_EST = data.autostopTimeoutEst;
    if (data.autostopTimeoutInit) envVariables.AUTOSTOP_TIMEOUT_INIT = data.autostopTimeoutInit;
    if (data.autostopPeriod) envVariables.AUTOSTOP_PERIOD = data.autostopPeriod;

    if (data.plugins) envVariables.PLUGINS = data.plugins;
    if (data.removeOldPlugins) envVariables.REMOVE_OLD_PLUGINS = String(data.removeOldPlugins);
    if (data.spigetResources) envVariables.SPIGET_RESOURCES = data.spigetResources;

    if (data.paperBuild) envVariables.PAPER_BUILD = data.paperBuild;

    if (data.type === "CUSTOM" && data.customJarUrl) {
      envVariables.CUSTOM_SERVER = data.customJarUrl;
      envVariables.VERSION = "";
    }

    if (data.timezone) envVariables.TZ = data.timezone;
    if (data.uid) envVariables.UID = data.uid;
    if (data.gid) envVariables.GID = data.gid;
    if (data.stopDuration) envVariables.STOP_DURATION = data.stopDuration;
    if (data.serverIcon) envVariables.ICON = data.serverIcon;

    envVariables.EULA = String(data.eula);
    envVariables.TYPE = data.type;
    if (data.type !== "CUSTOM" && data.version) {
      envVariables.VERSION = data.version;
    }
    if (data.type === "CUSTOM" && !data.customJarUrl) {
      throw new Error("Custom jar URL is required for custom servers");
    }

    for (const envVar of filteredEnvVars) {
      envVariables[envVar.key] = envVar.value;
    }

    const payload: UpdateServerRequest = {
      description: data.description.trim() || null,
      listen_port: Number(data.listenPort),
      service_type: data.serviceType,
      node_port: data.serviceType === "NODE_PORT" && data.nodePort ? Number(data.nodePort) : null,
      env_variables: Object.entries(envVariables).map(([key, value]) => ({ key, value })),
      memory: data.memoryLimit ? Number(data.memoryLimit) : undefined,
      memory_request: data.memoryRequest ? Number(data.memoryRequest) : undefined,
      cpu_request: data.cpuRequest || undefined,
      cpu_limit: data.cpuLimit || undefined,
      jar_type: data.type === "CUSTOM" ? "VANILLA" : data.type,
      minecraft_version: data.type === "CUSTOM" ? undefined : data.version || "LATEST",
      jvm_opts: data.jvmOpts || undefined,
      use_aikar_flags: data.useAikarFlags || undefined,
      use_meowice_flags: data.useMeowiceFlags || undefined,
      difficulty: data.difficulty,
      game_mode: data.mode,
      max_players: data.maxPlayers ? Number(data.maxPlayers) : undefined,
      pvp: data.pvp,
      online_mode: data.onlineMode,
      motd: data.motd,
      level_seed: data.levelSeed,
      level_type: data.levelType,
    };

    const response = await api.api.servers({ id: serverId }).patch(payload);

    if (response.error) {
      const errorMsg =
        typeof response.error === "object" &&
        response.error &&
        "value" in response.error &&
        typeof response.error.value === "object" &&
        response.error.value &&
        "message" in response.error.value
          ? String(response.error.value.message)
          : "Failed to update server";
      throw new Error(errorMsg);
    }

    router.push("/dashboard/servers");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading server data...</p>
        </div>
      </div>
    );
  }

  if (error || !serverData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive px-6 py-4 rounded-lg">
            {error || "Server not found"}
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/dashboard/servers")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Servers
          </Button>
        </div>
      </div>
    );
  }

  const envVars = parseEnvVariables(serverData.env_variables);

  const dockerManagedKeys = new Set([
    "EULA",
    "TYPE",
    "VERSION",
    "CUSTOM_SERVER",
    "MOTD",
    "DIFFICULTY",
    "MODE",
    "MAX_PLAYERS",
    "PVP",
    "ONLINE_MODE",
    "ALLOW_FLIGHT",
    "ENABLE_COMMAND_BLOCK",
    "SPAWN_PROTECTION",
    "VIEW_DISTANCE",
    "SIMULATION_DISTANCE",
    "LEVEL",
    "SEED",
    "LEVEL_TYPE",
    "GENERATOR_SETTINGS",
    "HARDCORE",
    "SPAWN_ANIMALS",
    "SPAWN_MONSTERS",
    "SPAWN_NPCS",
    "ENABLE_WHITELIST",
    "WHITELIST",
    "WHITELIST_FILE",
    "OPS",
    "OPS_FILE",
    "USE_AIKAR_FLAGS",
    "USE_MEOWICE_FLAGS",
    "JVM_OPTS",
    "JVM_XX_OPTS",
    "JVM_DD_OPTS",
    "ENABLE_JMX",
    "RESOURCE_PACK",
    "RESOURCE_PACK_SHA1",
    "RESOURCE_PACK_ENFORCE",
    "ENABLE_RCON",
    "RCON_PASSWORD",
    "RCON_PORT",
    "RCON_CMDS_STARTUP",
    "RCON_CMDS_ON_CONNECT",
    "RCON_CMDS_FIRST_CONNECT",
    "RCON_CMDS_ON_DISCONNECT",
    "RCON_CMDS_LAST_DISCONNECT",
    "ENABLE_QUERY",
    "QUERY_PORT",
    "ENABLE_AUTOPAUSE",
    "AUTOPAUSE_TIMEOUT_EST",
    "AUTOPAUSE_TIMEOUT_INIT",
    "AUTOPAUSE_TIMEOUT_KN",
    "AUTOPAUSE_PERIOD",
    "AUTOPAUSE_KNOCK_INTERFACE",
    "ENABLE_AUTOSTOP",
    "AUTOSTOP_TIMEOUT_EST",
    "AUTOSTOP_TIMEOUT_INIT",
    "AUTOSTOP_PERIOD",
    "PLUGINS",
    "REMOVE_OLD_PLUGINS",
    "SPIGET_RESOURCES",
    "PAPER_BUILD",
    "TZ",
    "UID",
    "GID",
    "STOP_DURATION",
    "ICON",
  ]);

  const customEnvVars = Object.entries(envVars)
    .filter(([key]) => !dockerManagedKeys.has(key))
    .map(([key, value]) => ({ id: crypto.randomUUID(), key, value }));

  const initialData: Partial<ServerFormData> = {
    id: serverData.id,
    description: serverData.description || "",
    memoryLimit: String(serverData.memory || 2048),
    memoryRequest: String(serverData.memory_request ?? 1024),
    cpuRequest: serverData.cpu_request || "500m",
    cpuLimit: serverData.cpu_limit || "2",
    type: (envVars.TYPE || serverData.jar_type || "PAPER") as ServerType,
    version: envVars.VERSION || serverData.minecraft_version || "",
    customJarUrl: envVars.CUSTOM_SERVER || undefined,
    eula: envVars.EULA === "true",
    listenPort: String(serverData.listen_port || 25565),
    serviceType: toServiceType(serverData.service_type),
    nodePort: serverData.node_port ? String(serverData.node_port) : undefined,

    motd: envVars.MOTD || serverData.motd || undefined,
    difficulty: toDifficulty(envVars.DIFFICULTY || serverData.difficulty),
    mode: toMode(envVars.MODE || serverData.game_mode),
    maxPlayers: envVars.MAX_PLAYERS || String(serverData.max_players || 20),
    pvp: envVars.PVP ? envVars.PVP === "true" : (serverData.pvp ?? true),
    onlineMode: envVars.ONLINE_MODE
      ? envVars.ONLINE_MODE === "true"
      : (serverData.online_mode ?? true),
    allowFlight: envVars.ALLOW_FLIGHT === "true",
    enableCommandBlock: envVars.ENABLE_COMMAND_BLOCK === "true",
    spawnProtection: envVars.SPAWN_PROTECTION || "16",
    viewDistance: envVars.VIEW_DISTANCE || "10",
    simulationDistance: envVars.SIMULATION_DISTANCE || "10",

    levelName: envVars.LEVEL || "world",
    levelSeed: envVars.SEED || serverData.level_seed || undefined,
    levelType: envVars.LEVEL_TYPE || serverData.level_type || undefined,
    generatorSettings: envVars.GENERATOR_SETTINGS || undefined,
    hardcore: envVars.HARDCORE === "true",
    spawnAnimals: envVars.SPAWN_ANIMALS !== "false",
    spawnMonsters: envVars.SPAWN_MONSTERS !== "false",
    spawnNpcs: envVars.SPAWN_NPCS !== "false",

    enableWhitelist: envVars.ENABLE_WHITELIST === "true",
    whitelist: envVars.WHITELIST || undefined,
    whitelistFile: envVars.WHITELIST_FILE || undefined,
    ops: envVars.OPS || undefined,
    opsFile: envVars.OPS_FILE || undefined,

    useAikarFlags: envVars.USE_AIKAR_FLAGS === "true" || serverData.use_aikar_flags || false,
    useMeowiceFlags: envVars.USE_MEOWICE_FLAGS === "true" || serverData.use_meowice_flags || false,
    jvmOpts: envVars.JVM_OPTS || serverData.jvm_opts || undefined,
    jvmXxOpts: envVars.JVM_XX_OPTS || undefined,
    jvmDdOpts: envVars.JVM_DD_OPTS || undefined,
    enableJmx: envVars.ENABLE_JMX === "true",

    resourcePack: envVars.RESOURCE_PACK || undefined,
    resourcePackSha1: envVars.RESOURCE_PACK_SHA1 || undefined,
    resourcePackEnforce: envVars.RESOURCE_PACK_ENFORCE === "true",

    enableRcon: envVars.ENABLE_RCON !== "false",
    rconPassword: envVars.RCON_PASSWORD || undefined,
    rconPort: envVars.RCON_PORT || "25575",
    rconCmdsStartup: envVars.RCON_CMDS_STARTUP || undefined,
    rconCmdsOnConnect: envVars.RCON_CMDS_ON_CONNECT || undefined,
    rconCmdsFirstConnect: envVars.RCON_CMDS_FIRST_CONNECT || undefined,
    rconCmdsOnDisconnect: envVars.RCON_CMDS_ON_DISCONNECT || undefined,
    rconCmdsLastDisconnect: envVars.RCON_CMDS_LAST_DISCONNECT || undefined,

    enableQuery: envVars.ENABLE_QUERY === "true",
    queryPort: envVars.QUERY_PORT || "25565",

    enableAutopause: envVars.ENABLE_AUTOPAUSE === "true",
    autopauseTimeoutEst: envVars.AUTOPAUSE_TIMEOUT_EST || "3600",
    autopauseTimeoutInit: envVars.AUTOPAUSE_TIMEOUT_INIT || "600",
    autopauseTimeoutKn: envVars.AUTOPAUSE_TIMEOUT_KN || "120",
    autopausePeriod: envVars.AUTOPAUSE_PERIOD || "10",
    autopauseKnockInterface: envVars.AUTOPAUSE_KNOCK_INTERFACE || "eth0",

    enableAutostop: envVars.ENABLE_AUTOSTOP === "true",
    autostopTimeoutEst: envVars.AUTOSTOP_TIMEOUT_EST || "3600",
    autostopTimeoutInit: envVars.AUTOSTOP_TIMEOUT_INIT || "1800",
    autostopPeriod: envVars.AUTOSTOP_PERIOD || "10",

    plugins: envVars.PLUGINS || undefined,
    removeOldPlugins: envVars.REMOVE_OLD_PLUGINS === "true",
    spigetResources: envVars.SPIGET_RESOURCES || undefined,

    paperBuild: envVars.PAPER_BUILD || undefined,

    serverIcon: envVars.ICON || undefined,

    envVars: customEnvVars,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/servers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Server: {serverData.id}</h1>
          <p className="text-muted-foreground mt-1">Update your Minecraft server configuration</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server Configuration</CardTitle>
          <CardDescription>Modify settings for your Minecraft server</CardDescription>
        </CardHeader>
        <CardContent>
          <ServerForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/dashboard/servers")}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
