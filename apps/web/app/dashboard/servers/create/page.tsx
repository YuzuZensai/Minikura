"use client";

import type { CreateServerRequest } from "@minikura/api";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ServerForm, type ServerFormData } from "@/components/server-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";

const toDifficultyUppercase = (value: string): "PEACEFUL" | "EASY" | "NORMAL" | "HARD" => {
  return value.toUpperCase() as "PEACEFUL" | "EASY" | "NORMAL" | "HARD";
};

const toModeUppercase = (value: string): "SURVIVAL" | "CREATIVE" | "ADVENTURE" | "SPECTATOR" => {
  return value.toUpperCase() as "SURVIVAL" | "CREATIVE" | "ADVENTURE" | "SPECTATOR";
};

export default function CreateServerPage() {
  const router = useRouter();

  const handleSubmit = async (data: ServerFormData) => {
    const filteredEnvVars = data.envVars.filter((ev) => ev.key && ev.value);

    const envVariables: Record<string, string> = {};

    if (data.allowFlight) envVariables.ALLOW_FLIGHT = String(data.allowFlight);
    if (data.enableCommandBlock)
      envVariables.ENABLE_COMMAND_BLOCK = String(data.enableCommandBlock);
    if (data.spawnProtection) envVariables.SPAWN_PROTECTION = data.spawnProtection;
    if (data.viewDistance) envVariables.VIEW_DISTANCE = data.viewDistance;
    if (data.simulationDistance) envVariables.SIMULATION_DISTANCE = data.simulationDistance;

    if (data.levelName) envVariables.LEVEL = data.levelName;
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

    const payload: CreateServerRequest = {
      id: data.id.trim(),
      description: data.description.trim() || null,
      listen_port: Number(data.listenPort),
      type: "STATEFUL",
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
      difficulty: toDifficultyUppercase(data.difficulty),
      game_mode: toModeUppercase(data.mode),
      max_players: data.maxPlayers ? Number(data.maxPlayers) : undefined,
      pvp: data.pvp,
      online_mode: data.onlineMode,
      motd: data.motd,
      level_seed: data.levelSeed,
      level_type: data.levelType,
    };

    const response = await api.api.servers.post(payload);

    if (response.error) {
      const errorMsg =
        typeof response.error === "object" &&
        response.error &&
        "value" in response.error &&
        typeof response.error.value === "object" &&
        response.error.value &&
        "message" in response.error.value
          ? String(response.error.value.message)
          : "Failed to create server";
      throw new Error(errorMsg);
    }

    router.push("/dashboard/servers");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/servers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Minecraft Server</h1>
          <p className="text-muted-foreground mt-1">
            Configure your new Minecraft server with comprehensive settings
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server Configuration</CardTitle>
          <CardDescription>
            Complete configuration for itzg/minecraft-server Docker image with all environment
            variables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServerForm
            onSubmit={handleSubmit}
            onCancel={() => router.push("/dashboard/servers")}
            submitLabel="Create Server"
          />
        </CardContent>
      </Card>
    </div>
  );
}
