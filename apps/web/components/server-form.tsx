"use client";

import type { GameMode, ServiceType as PrismaServiceType, ServerDifficulty } from "@minikura/db";
import { Info, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type ServerType = "VANILLA" | "PAPER" | "SPIGOT" | "PURPUR" | "FABRIC" | "CUSTOM";
export type ServiceType = PrismaServiceType;
export type Difficulty = ServerDifficulty;
export type Mode = GameMode;

export interface EnvVar {
  id?: string;
  key: string;
  value: string;
}

export interface ServerFormData {
  // Basic Configuration
  id: string;
  description: string;
  memoryLimit: string;
  memoryRequest: string;
  cpuRequest: string;
  cpuLimit: string;

  // Server Type & Version
  type: ServerType;
  version?: string;
  customJarUrl?: string;
  eula: boolean;

  // Network Configuration
  listenPort: string;
  serviceType: ServiceType;
  nodePort?: string;

  // Server Properties
  motd?: string;
  difficulty: "peaceful" | "easy" | "normal" | "hard";
  mode: "survival" | "creative" | "adventure" | "spectator";
  maxPlayers: string;
  pvp: boolean;
  onlineMode: boolean;
  allowFlight: boolean;
  enableCommandBlock: boolean;
  spawnProtection: string;
  viewDistance: string;
  simulationDistance: string;

  // World Configuration
  levelName: string;
  levelSeed?: string;
  levelType?: string;
  generatorSettings?: string;
  hardcore: boolean;
  spawnAnimals: boolean;
  spawnMonsters: boolean;
  spawnNpcs: boolean;

  // Player Management
  enableWhitelist: boolean;
  whitelist?: string;
  whitelistFile?: string;
  ops?: string;
  opsFile?: string;

  // JVM & Performance
  useAikarFlags: boolean;
  useMeowiceFlags: boolean;
  jvmOpts?: string;
  jvmXxOpts?: string;
  jvmDdOpts?: string;

  // Resource Pack

  resourcePack?: string;
  resourcePackSha1?: string;
  resourcePackEnforce: boolean;

  // RCON Configuration
  enableRcon: boolean;
  rconPassword?: string;
  rconPort: string;
  rconCmdsStartup?: string;
  rconCmdsOnConnect?: string;
  rconCmdsFirstConnect?: string;
  rconCmdsOnDisconnect?: string;
  rconCmdsLastDisconnect?: string;

  // Query Protocol
  enableQuery: boolean;
  queryPort: string;

  // Auto-Pause
  enableAutopause: boolean;
  autopauseTimeoutEst: string;
  autopauseTimeoutInit: string;
  autopauseTimeoutKn: string;
  autopausePeriod: string;
  autopauseKnockInterface: string;

  // Auto-Stop
  enableAutostop: boolean;
  autostopTimeoutEst: string;
  autostopTimeoutInit: string;
  autostopPeriod: string;

  // Mods & Plugins
  plugins?: string;
  removeOldPlugins: boolean;
  spigetResources?: string;

  // Type-Specific Options
  paperBuild?: string;

  // Advanced
  timezone: string;
  uid: string;
  gid: string;
  enableJmx: boolean;
  stopDuration: string;
  serverIcon?: string;

  // Environment Variables
  envVars: EnvVar[];
}

const toMode = (value: string): ServerFormData["mode"] => {
  if (value === "creative" || value === "adventure" || value === "spectator") {
    return value;
  }
  return "survival";
};

const toDifficulty = (value: string): ServerFormData["difficulty"] => {
  if (value === "peaceful" || value === "normal" || value === "hard") {
    return value;
  }
  return "easy";
};

interface ServerFormProps {
  initialData?: Partial<ServerFormData>;
  onSubmit: (data: ServerFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="inline-flex items-center group relative ml-1">
    <Info className="h-4 w-4 text-muted-foreground" />
    <span className="absolute left-full ml-2 w-64 bg-popover text-popover-foreground text-xs rounded p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 shadow-lg border">
      {text}
    </span>
  </div>
);

export function ServerForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Create Server",
  loading = false,
}: ServerFormProps) {
  const defaultType = initialData?.type || "PAPER";
  const defaultVersion = defaultType === "CUSTOM" ? "" : initialData?.version || "LATEST";

  const [formData, setFormData] = useState<ServerFormData>({
    id: initialData?.id || "",
    description: initialData?.description || "",
    memoryLimit: initialData?.memoryLimit || "2048",
    memoryRequest: initialData?.memoryRequest || "1024",
    cpuRequest: initialData?.cpuRequest || "500m",
    cpuLimit: initialData?.cpuLimit || "2",
    type: defaultType,
    version: defaultVersion,
    eula: initialData?.eula ?? true,
    listenPort: initialData?.listenPort || "25565",
    serviceType: initialData?.serviceType || "CLUSTER_IP",
    difficulty: initialData?.difficulty || "easy",
    mode: initialData?.mode || "survival",
    maxPlayers: initialData?.maxPlayers || "20",
    pvp: initialData?.pvp ?? true,
    onlineMode: initialData?.onlineMode ?? true,
    allowFlight: initialData?.allowFlight ?? false,
    enableCommandBlock: initialData?.enableCommandBlock ?? false,
    spawnProtection: initialData?.spawnProtection || "16",
    viewDistance: initialData?.viewDistance || "10",
    simulationDistance: initialData?.simulationDistance || "10",
    levelName: initialData?.levelName || "world",
    hardcore: initialData?.hardcore ?? false,
    spawnAnimals: initialData?.spawnAnimals ?? true,
    spawnMonsters: initialData?.spawnMonsters ?? true,
    spawnNpcs: initialData?.spawnNpcs ?? true,
    enableWhitelist: initialData?.enableWhitelist ?? false,
    useAikarFlags: initialData?.useAikarFlags ?? false,
    useMeowiceFlags: initialData?.useMeowiceFlags ?? false,
    resourcePackEnforce: initialData?.resourcePackEnforce ?? false,
    enableRcon: initialData?.enableRcon ?? true,
    rconPort: initialData?.rconPort || "25575",
    enableQuery: initialData?.enableQuery ?? false,
    queryPort: initialData?.queryPort || "25565",
    enableAutopause: initialData?.enableAutopause ?? false,
    autopauseTimeoutEst: initialData?.autopauseTimeoutEst || "3600",
    autopauseTimeoutInit: initialData?.autopauseTimeoutInit || "600",
    autopauseTimeoutKn: initialData?.autopauseTimeoutKn || "120",
    autopausePeriod: initialData?.autopausePeriod || "10",
    autopauseKnockInterface: initialData?.autopauseKnockInterface || "eth0",
    enableAutostop: initialData?.enableAutostop ?? false,
    autostopTimeoutEst: initialData?.autostopTimeoutEst || "3600",
    autostopTimeoutInit: initialData?.autostopTimeoutInit || "1800",
    autostopPeriod: initialData?.autostopPeriod || "10",
    removeOldPlugins: initialData?.removeOldPlugins ?? false,
    timezone: initialData?.timezone || "UTC",
    uid: initialData?.uid || "1000",
    gid: initialData?.gid || "1000",
    enableJmx: initialData?.enableJmx ?? false,
    stopDuration: initialData?.stopDuration || "60",
    customJarUrl: initialData?.customJarUrl || "",
    envVars: (initialData?.envVars || []).map((envVar) => ({
      id: envVar.id || crypto.randomUUID(),
      key: envVar.key,
      value: envVar.value,
    })),
  });

  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof ServerFormData>(key: K, value: ServerFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addEnvVar = () => {
    setFormData((prev) => ({
      ...prev,
      envVars: [...prev.envVars, { id: crypto.randomUUID(), key: "", value: "" }],
    }));
  };

  const removeEnvVar = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      envVars: prev.envVars.filter((_, i) => i !== index),
    }));
  };

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    setFormData((prev) => {
      const updated = [...prev.envVars];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, envVars: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.id.trim()) {
      setError("Server ID is required");
      return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(formData.id)) {
      setError("ID must be alphanumeric with - or _");
      return;
    }

    if (!formData.eula) {
      setError("You must accept the Minecraft EULA to create a server");
      return;
    }

    if (formData.type === "CUSTOM" && !formData.customJarUrl?.trim()) {
      setError("Custom jar URL is required for custom servers");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:grid-cols-10">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="world">World</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="mods">Mods/Plugins</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Basic Configuration */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="id">Server ID *</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => updateField("id", e.target.value)}
              placeholder="my-server"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="A brief description of this server"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="memoryRequest">
                Memory Request (MB) *
                <InfoTooltip text="Kubernetes guaranteed memory. Java heap sizes from the limit." />
              </Label>
              <Input
                id="memoryRequest"
                type="number"
                value={formData.memoryRequest}
                onChange={(e) => updateField("memoryRequest", e.target.value)}
                min="256"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memoryLimit">
                Memory Limit (MB) *
                <InfoTooltip text="Kubernetes max memory. Java heap scales from this." />
              </Label>
              <Input
                id="memoryLimit"
                type="number"
                value={formData.memoryLimit}
                onChange={(e) => updateField("memoryLimit", e.target.value)}
                min="256"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpuRequest">
                CPU Request *
                <InfoTooltip text="Guaranteed CPU allocation (e.g., 500m = 0.5 cores)" />
              </Label>
              <Input
                id="cpuRequest"
                value={formData.cpuRequest}
                onChange={(e) => updateField("cpuRequest", e.target.value)}
                placeholder="500m"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpuLimit">
                CPU Limit *
                <InfoTooltip text="Maximum CPU the server can use" />
              </Label>
              <Input
                id="cpuLimit"
                value={formData.cpuLimit}
                onChange={(e) => updateField("cpuLimit", e.target.value)}
                placeholder="2"
              />
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced-memory">
              <AccordionTrigger>Java Heap Overrides</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                Heap sizes are derived from the memory limit. Override only if needed.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="eula"
              checked={formData.eula}
              onCheckedChange={(checked) => updateField("eula", checked as boolean)}
            />
            <Label htmlFor="eula" className="cursor-pointer">
              I accept the{" "}
              <a
                href="https://www.minecraft.net/eula"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Minecraft EULA
              </a>{" "}
              *
            </Label>
          </div>
        </TabsContent>

        {/* Server Type & Configuration */}
        <TabsContent value="server" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Custom jars may ignore built-in server settings. Configure extra values via custom
              environment variables if needed.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="type">
              Server Type *
              <InfoTooltip text="Choose the server software (Vanilla, Paper, or Custom Jar)." />
            </Label>

            <Select
              value={formData.type}
              onValueChange={(value) => updateField("type", value as ServerType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VANILLA">Vanilla (Official Mojang)</SelectItem>
                <SelectItem value="PAPER">Paper (Recommended - High Performance)</SelectItem>
                <SelectItem value="CUSTOM">Custom Jar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type !== "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="version">
                Minecraft Version
                <InfoTooltip text="Use LATEST for newest stable, SNAPSHOT for snapshots, or specific version like 1.20.4" />
              </Label>
              <Input
                id="version"
                value={formData.version || ""}
                onChange={(e) => updateField("version", e.target.value)}
                placeholder="LATEST"
              />
            </div>
          )}

          {/* Type-specific options */}
          {formData.type === "PAPER" && (
            <div className="space-y-2">
              <Label htmlFor="paperBuild">Paper Build Number</Label>
              <Input
                id="paperBuild"
                value={formData.paperBuild || ""}
                onChange={(e) => updateField("paperBuild", e.target.value)}
                placeholder="Leave empty for latest"
              />
            </div>
          )}

          {formData.type === "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="customJarUrl">Custom Server Jar URL/Path</Label>
              <Input
                id="customJarUrl"
                value={formData.customJarUrl || ""}
                onChange={(e) => updateField("customJarUrl", e.target.value)}
                placeholder="https://example.com/server.jar"
              />
              <p className="text-sm text-muted-foreground">
                Sets CUSTOM_SERVER for the itzg/minecraft-server image.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motd">Message of the Day (MOTD)</Label>
            <Textarea
              id="motd"
              value={formData.motd || ""}
              onChange={(e) => updateField("motd", e.target.value)}
              placeholder="A Minecraft Server"
              rows={2}
            />
            <p className="text-sm text-muted-foreground">
              Supports formatting codes like §l for bold, §c for red
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mode">Game Mode</Label>
              <Select
                value={formData.mode}
                onValueChange={(value) => updateField("mode", toMode(value))}
              >
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="survival">Survival</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="spectator">Spectator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => updateField("difficulty", toDifficulty(value))}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="peaceful">Peaceful</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Max Players</Label>
              <Input
                id="maxPlayers"
                type="number"
                value={formData.maxPlayers}
                onChange={(e) => updateField("maxPlayers", e.target.value)}
                min="1"
                max="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="viewDistance">View Distance (chunks)</Label>
              <Input
                id="viewDistance"
                type="number"
                value={formData.viewDistance}
                onChange={(e) => updateField("viewDistance", e.target.value)}
                min="3"
                max="32"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pvp"
                checked={formData.pvp}
                onCheckedChange={(checked) => updateField("pvp", checked as boolean)}
              />
              <Label htmlFor="pvp">Enable PvP (Player vs Player)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="onlineMode"
                checked={formData.onlineMode}
                onCheckedChange={(checked) => updateField("onlineMode", checked as boolean)}
              />
              <Label htmlFor="onlineMode">
                Online Mode (Requires authenticated Minecraft accounts)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowFlight"
                checked={formData.allowFlight}
                onCheckedChange={(checked) => updateField("allowFlight", checked as boolean)}
              />
              <Label htmlFor="allowFlight">Allow Flight</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableCommandBlock"
                checked={formData.enableCommandBlock}
                onCheckedChange={(checked) => updateField("enableCommandBlock", checked as boolean)}
              />
              <Label htmlFor="enableCommandBlock">Enable Command Blocks</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hardcore"
                checked={formData.hardcore}
                onCheckedChange={(checked) => updateField("hardcore", checked as boolean)}
              />
              <Label htmlFor="hardcore">Hardcore Mode (Permanent Death)</Label>
            </div>
          </div>
        </TabsContent>

        {/* World Configuration */}
        <TabsContent value="world" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              World options apply to standard server properties and may be ignored by custom jars.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="levelName">World Name</Label>
            <Input
              id="levelName"
              value={formData.levelName}
              onChange={(e) => updateField("levelName", e.target.value)}
              placeholder="world"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="levelSeed">
              World Seed
              <InfoTooltip text="Leave empty for random generation. Can be numeric or text." />
            </Label>
            <Input
              id="levelSeed"
              value={formData.levelSeed || ""}
              onChange={(e) => updateField("levelSeed", e.target.value)}
              placeholder="Leave empty for random"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="levelType">Level Type</Label>
            <Select
              value={formData.levelType || "default"}
              onValueChange={(value) => updateField("levelType", value === "default" ? "" : value)}
            >
              <SelectTrigger id="levelType">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="flat">Flat/Superflat</SelectItem>
                <SelectItem value="largeBiomes">Large Biomes</SelectItem>
                <SelectItem value="amplified">Amplified</SelectItem>
                <SelectItem value="buffet">Buffet (Single Biome)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="generatorSettings">
              Generator Settings
              <InfoTooltip text="JSON configuration for custom world generation. Advanced users only." />
            </Label>
            <Textarea
              id="generatorSettings"
              value={formData.generatorSettings || ""}
              onChange={(e) => updateField("generatorSettings", e.target.value)}
              placeholder='{"structures": {...}, "layers": [...]}'
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spawnProtection">
                Spawn Protection (blocks)
                <InfoTooltip text="Radius around spawn where only ops can build. Set to 0 to disable." />
              </Label>
              <Input
                id="spawnProtection"
                type="number"
                value={formData.spawnProtection}
                onChange={(e) => updateField("spawnProtection", e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="simulationDistance">
                Simulation Distance
                <InfoTooltip text="Distance in chunks where game logic runs (redstone, crops, etc.)" />
              </Label>
              <Input
                id="simulationDistance"
                type="number"
                value={formData.simulationDistance}
                onChange={(e) => updateField("simulationDistance", e.target.value)}
                min="3"
                max="32"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spawnAnimals"
                checked={formData.spawnAnimals}
                onCheckedChange={(checked) => updateField("spawnAnimals", checked as boolean)}
              />
              <Label htmlFor="spawnAnimals">Spawn Animals</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="spawnMonsters"
                checked={formData.spawnMonsters}
                onCheckedChange={(checked) => updateField("spawnMonsters", checked as boolean)}
              />
              <Label htmlFor="spawnMonsters">Spawn Monsters</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="spawnNpcs"
                checked={formData.spawnNpcs}
                onCheckedChange={(checked) => updateField("spawnNpcs", checked as boolean)}
              />
              <Label htmlFor="spawnNpcs">Spawn NPCs (Villagers)</Label>
            </div>
          </div>
        </TabsContent>

        {/* Player Management */}
        <TabsContent value="players" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Some custom jars do not support managed whitelist/ops settings.
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableWhitelist"
              checked={formData.enableWhitelist}
              onCheckedChange={(checked) => updateField("enableWhitelist", checked as boolean)}
            />
            <Label htmlFor="enableWhitelist">
              Enable Whitelist
              <InfoTooltip text="Only whitelisted players can join the server" />
            </Label>
          </div>

          {formData.enableWhitelist && (
            <>
              <div className="space-y-2">
                <Label htmlFor="whitelist">
                  Whitelisted Players
                  <InfoTooltip text="Comma-separated list of usernames or UUIDs" />
                </Label>
                <Textarea
                  id="whitelist"
                  value={formData.whitelist || ""}
                  onChange={(e) => updateField("whitelist", e.target.value)}
                  placeholder="Player1,Player2,UUID-here"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whitelistFile">
                  Whitelist File URL
                  <InfoTooltip text="URL or path to a whitelist.json file. Overrides the whitelist field." />
                </Label>
                <Input
                  id="whitelistFile"
                  value={formData.whitelistFile || ""}
                  onChange={(e) => updateField("whitelistFile", e.target.value)}
                  placeholder="https://example.com/whitelist.json"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="ops">
              Operators (Ops)
              <InfoTooltip text="Comma-separated list of usernames or UUIDs with full server permissions" />
            </Label>
            <Textarea
              id="ops"
              value={formData.ops || ""}
              onChange={(e) => updateField("ops", e.target.value)}
              placeholder="Admin1,Admin2"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opsFile">Ops File URL</Label>
            <Input
              id="opsFile"
              value={formData.opsFile || ""}
              onChange={(e) => updateField("opsFile", e.target.value)}
              placeholder="https://example.com/ops.json"
            />
          </div>
        </TabsContent>

        {/* Performance & JVM */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Custom jars may not honor built-in tuning flags. Use custom env vars if required.
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useAikarFlags"
                checked={formData.useAikarFlags}
                onCheckedChange={(checked) => updateField("useAikarFlags", checked as boolean)}
              />
              <Label htmlFor="useAikarFlags">
                Use Aikar's Flags
                <InfoTooltip text="Optimized G1GC garbage collection flags. Recommended for servers with 1GB+ RAM." />
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useMeowiceFlags"
                checked={formData.useMeowiceFlags}
                onCheckedChange={(checked) => updateField("useMeowiceFlags", checked as boolean)}
              />
              <Label htmlFor="useMeowiceFlags">
                Use Meowice Flags
                <InfoTooltip text="Modern optimization flags for Java 17+. Based on Aikar's flags with improvements." />
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableJmx"
                checked={formData.enableJmx}
                onCheckedChange={(checked) => updateField("enableJmx", checked as boolean)}
              />
              <Label htmlFor="enableJmx">
                Enable JMX
                <InfoTooltip text="Enables remote JMX monitoring for advanced profiling" />
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jvmOpts">
              Custom JVM Options
              <InfoTooltip text="Space-separated JVM arguments (e.g., -Xms2G -Xmx4G)" />
            </Label>
            <Textarea
              id="jvmOpts"
              value={formData.jvmOpts || ""}
              onChange={(e) => updateField("jvmOpts", e.target.value)}
              placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=200"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jvmXxOpts">
              JVM -XX Options
              <InfoTooltip text="Space-separated -XX JVM flags for advanced tuning" />
            </Label>
            <Textarea
              id="jvmXxOpts"
              value={formData.jvmXxOpts || ""}
              onChange={(e) => updateField("jvmXxOpts", e.target.value)}
              placeholder="+UnlockExperimentalVMOptions +UseZGC"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jvmDdOpts">
              JVM -D System Properties
              <InfoTooltip text="Comma-separated key=value pairs for system properties" />
            </Label>
            <Textarea
              id="jvmDdOpts"
              value={formData.jvmDdOpts || ""}
              onChange={(e) => updateField("jvmDdOpts", e.target.value)}
              placeholder="property1=value1,property2=value2"
              rows={2}
            />
          </div>
        </TabsContent>

        {/* Mods & Plugins */}
        <TabsContent value="mods" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Mods/plugins automation is intended for Vanilla/Paper workflows.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plugins">
              Plugins
              <InfoTooltip text="Comma-separated list of plugin URLs or filenames" />
            </Label>
            <Textarea
              id="plugins"
              value={formData.plugins || ""}
              onChange={(e) => updateField("plugins", e.target.value)}
              placeholder="https://example.com/plugin1.jar,plugin2.jar"
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              For Paper/Spigot/Bukkit servers. URLs or local filenames.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spigetResources">
              Spiget Resource IDs
              <InfoTooltip text="Comma-separated Spiget resource IDs to auto-download from SpigotMC" />
            </Label>
            <Input
              id="spigetResources"
              value={formData.spigetResources || ""}
              onChange={(e) => updateField("spigetResources", e.target.value)}
              placeholder="1234,5678,9012"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="removeOldPlugins"
                checked={formData.removeOldPlugins}
                onCheckedChange={(checked) => updateField("removeOldPlugins", checked as boolean)}
              />
              <Label htmlFor="removeOldPlugins">
                Remove Old Plugins
                <InfoTooltip text="Automatically remove old versions of plugins when updating" />
              </Label>
            </div>
          </div>
        </TabsContent>

        {/* Resources (Resource Pack, Icon) */}
        <TabsContent value="resources" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Resource pack settings may not apply to custom jars.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="resourcePack">
              Resource Pack URL
              <InfoTooltip text="URL or path to a resource pack ZIP file" />
            </Label>
            <Input
              id="resourcePack"
              value={formData.resourcePack || ""}
              onChange={(e) => updateField("resourcePack", e.target.value)}
              placeholder="https://example.com/resourcepack.zip"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resourcePackSha1">
              Resource Pack SHA1
              <InfoTooltip text="SHA1 checksum of the resource pack for verification" />
            </Label>
            <Input
              id="resourcePackSha1"
              value={formData.resourcePackSha1 || ""}
              onChange={(e) => updateField("resourcePackSha1", e.target.value)}
              placeholder="a1b2c3d4e5f6..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="resourcePackEnforce"
              checked={formData.resourcePackEnforce}
              onCheckedChange={(checked) => updateField("resourcePackEnforce", checked as boolean)}
            />
            <Label htmlFor="resourcePackEnforce">
              Enforce Resource Pack
              <InfoTooltip text="Require players to accept the resource pack to join" />
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serverIcon">
              Server Icon URL
              <InfoTooltip text="URL or path to a server icon image (PNG, 64x64 recommended)" />
            </Label>
            <Input
              id="serverIcon"
              value={formData.serverIcon || ""}
              onChange={(e) => updateField("serverIcon", e.target.value)}
              placeholder="https://example.com/icon.png"
            />
          </div>
        </TabsContent>

        {/* Automation (Auto-Pause, Auto-Stop, RCON) */}
        <TabsContent value="automation" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Automation hooks depend on container scripts; custom jars may ignore them.
            </div>
          )}
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="rcon">
              <AccordionTrigger>RCON Configuration</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableRcon"
                    checked={formData.enableRcon}
                    onCheckedChange={(checked) => updateField("enableRcon", checked as boolean)}
                  />
                  <Label htmlFor="enableRcon">
                    Enable RCON
                    <InfoTooltip text="Remote console for server management. Enabled by default for graceful shutdown." />
                  </Label>
                </div>

                {formData.enableRcon && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rconPassword">RCON Password</Label>
                        <Input
                          id="rconPassword"
                          type="password"
                          value={formData.rconPassword || ""}
                          onChange={(e) => updateField("rconPassword", e.target.value)}
                          placeholder="Auto-generated if empty"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rconPort">RCON Port</Label>
                        <Input
                          id="rconPort"
                          type="number"
                          value={formData.rconPort}
                          onChange={(e) => updateField("rconPort", e.target.value)}
                          min="1"
                          max="65535"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rconCmdsStartup">
                        RCON Commands on Startup
                        <InfoTooltip text="Semicolon-separated commands to run when server starts" />
                      </Label>
                      <Textarea
                        id="rconCmdsStartup"
                        value={formData.rconCmdsStartup || ""}
                        onChange={(e) => updateField("rconCmdsStartup", e.target.value)}
                        placeholder="say Server starting...;gamerule doDaylightCycle false"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rconCmdsOnConnect">Commands on Player Connect</Label>
                      <Textarea
                        id="rconCmdsOnConnect"
                        value={formData.rconCmdsOnConnect || ""}
                        onChange={(e) => updateField("rconCmdsOnConnect", e.target.value)}
                        placeholder="tell {{player}} Welcome to the server!"
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="query">
              <AccordionTrigger>Query Protocol</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableQuery"
                    checked={formData.enableQuery}
                    onCheckedChange={(checked) => updateField("enableQuery", checked as boolean)}
                  />
                  <Label htmlFor="enableQuery">
                    Enable Query Protocol
                    <InfoTooltip text="Allows external tools to query server status and player list" />
                  </Label>
                </div>

                {formData.enableQuery && (
                  <div className="space-y-2">
                    <Label htmlFor="queryPort">Query Port</Label>
                    <Input
                      id="queryPort"
                      type="number"
                      value={formData.queryPort}
                      onChange={(e) => updateField("queryPort", e.target.value)}
                      min="1"
                      max="65535"
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="autopause">
              <AccordionTrigger>Auto-Pause</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableAutopause"
                    checked={formData.enableAutopause}
                    onCheckedChange={(checked) =>
                      updateField("enableAutopause", checked as boolean)
                    }
                  />
                  <Label htmlFor="enableAutopause">
                    Enable Auto-Pause
                    <InfoTooltip text="Automatically pauses the server when no players are online to save resources" />
                  </Label>
                </div>

                {formData.enableAutopause && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="autopauseTimeoutEst">
                          Timeout After Disconnect (seconds)
                        </Label>
                        <Input
                          id="autopauseTimeoutEst"
                          type="number"
                          value={formData.autopauseTimeoutEst}
                          onChange={(e) => updateField("autopauseTimeoutEst", e.target.value)}
                          min="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopauseTimeoutInit">
                          Timeout After Startup (seconds)
                        </Label>
                        <Input
                          id="autopauseTimeoutInit"
                          type="number"
                          value={formData.autopauseTimeoutInit}
                          onChange={(e) => updateField("autopauseTimeoutInit", e.target.value)}
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="autopauseKnockInterface">Network Interface</Label>
                      <Input
                        id="autopauseKnockInterface"
                        value={formData.autopauseKnockInterface}
                        onChange={(e) => updateField("autopauseKnockInterface", e.target.value)}
                        placeholder="eth0"
                      />
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="autostop">
              <AccordionTrigger>Auto-Stop</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableAutostop"
                    checked={formData.enableAutostop}
                    onCheckedChange={(checked) => updateField("enableAutostop", checked as boolean)}
                  />
                  <Label htmlFor="enableAutostop">
                    Enable Auto-Stop
                    <InfoTooltip text="Automatically stops the server when no players are online" />
                  </Label>
                </div>

                {formData.enableAutostop && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="autostopTimeoutEst">
                        Timeout After Player Departure (seconds)
                      </Label>
                      <Input
                        id="autostopTimeoutEst"
                        type="number"
                        value={formData.autostopTimeoutEst}
                        onChange={(e) => updateField("autostopTimeoutEst", e.target.value)}
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="autostopTimeoutInit">Timeout After Launch (seconds)</Label>
                      <Input
                        id="autostopTimeoutInit"
                        type="number"
                        value={formData.autostopTimeoutInit}
                        onChange={(e) => updateField("autostopTimeoutInit", e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Network Configuration */}
        <TabsContent value="network" className="space-y-4 mt-4">
          {formData.type === "CUSTOM" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Network settings apply at the container level and still work with custom jars.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="listenPort">Listen Port</Label>
              <Input
                id="listenPort"
                type="number"
                value={formData.listenPort}
                onChange={(e) => updateField("listenPort", e.target.value)}
                min="1"
                max="65535"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">
                Service Type
                <InfoTooltip text="How the server is exposed in Kubernetes" />
              </Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) => updateField("serviceType", value as ServiceType)}
              >
                <SelectTrigger id="serviceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLUSTER_IP">ClusterIP (Internal Only)</SelectItem>
                  <SelectItem value="NODE_PORT">NodePort (External Access)</SelectItem>
                  <SelectItem value="LOAD_BALANCER">LoadBalancer (Cloud/MetalLB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.serviceType === "NODE_PORT" && (
            <div className="space-y-2">
              <Label htmlFor="nodePort">
                Node Port
                <InfoTooltip text="Specific port on the node (30000-32767). Leave empty for auto-assignment." />
              </Label>
              <Input
                id="nodePort"
                type="number"
                value={formData.nodePort || ""}
                onChange={(e) => updateField("nodePort", e.target.value)}
                placeholder="30000-32767"
                min="30000"
                max="32767"
              />
            </div>
          )}
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">
                Timezone
                <InfoTooltip text="Timezone for server logs and scheduling (e.g., America/New_York)" />
              </Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) => updateField("timezone", e.target.value)}
                placeholder="UTC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uid">
                User ID (UID)
                <InfoTooltip text="Linux user ID for the Minecraft process" />
              </Label>
              <Input
                id="uid"
                value={formData.uid}
                onChange={(e) => updateField("uid", e.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gid">
                Group ID (GID)
                <InfoTooltip text="Linux group ID for the Minecraft process" />
              </Label>
              <Input
                id="gid"
                value={formData.gid}
                onChange={(e) => updateField("gid", e.target.value)}
                placeholder="1000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stopDuration">
              Graceful Shutdown Timeout (seconds)
              <InfoTooltip text="How long to wait for graceful shutdown before forcing stop" />
            </Label>
            <Input
              id="stopDuration"
              type="number"
              value={formData.stopDuration}
              onChange={(e) => updateField("stopDuration", e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>
                Custom Environment Variables
                <InfoTooltip text="Additional environment variables to pass to the container" />
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variable
              </Button>
            </div>

            {formData.envVars.length > 0 && (
              <div className="space-y-3">
                {formData.envVars.map((envVar, index) => (
                  <div key={envVar.id} className="flex gap-2">
                    <Input
                      placeholder="KEY"
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(index, "key", e.target.value)}
                      className="flex-1 font-mono"
                    />
                    <Input
                      placeholder="value"
                      value={envVar.value}
                      onChange={(e) => updateEnvVar(index, "value", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeEnvVar(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
