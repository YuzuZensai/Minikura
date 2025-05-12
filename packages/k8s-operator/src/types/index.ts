import type { 
  ServerType, 
  ReverseProxyServerType, 
  Server as PrismaServer, 
  ReverseProxyServer as PrismaReverseProxyServer,
  CustomEnvironmentVariable
} from '@minikura/db';

// Base interface
export interface CustomResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    [key: string]: any;
  };
}

export type ServerConfig = Pick<PrismaServer, 'id' | 'description' | 'type' | 'listen_port' | 'memory'> & {
  apiKey: string;
  env_variables?: Array<Pick<CustomEnvironmentVariable, 'key' | 'value'>>;
};

export type MinecraftServerSpec = Pick<PrismaServer, 'id' | 'description' | 'type' | 'listen_port' | 'memory'> & {
  environmentVariables?: Array<Pick<CustomEnvironmentVariable, 'key' | 'value'>>;
};

export interface MinecraftServerStatus {
  phase: 'Pending' | 'Running' | 'Failed';
  message?: string;
  apiKey?: string;
  internalId?: string;
  lastSyncedAt?: string;
}

export interface MinecraftServerCRD extends CustomResource {
  spec: MinecraftServerSpec;
  status?: MinecraftServerStatus;
}

// Reverse Proxy Types

export type ReverseProxyConfig = Pick<
  PrismaReverseProxyServer, 
  'id' | 'description' | 'external_address' | 'external_port' | 'listen_port' | 'type' | 'memory'
> & {
  apiKey: string;
  env_variables?: Array<Pick<CustomEnvironmentVariable, 'key' | 'value'>>;
};

export type ReverseProxyServerSpec = Partial<
  Pick<PrismaReverseProxyServer, 'id' | 'description' | 'external_address' | 'external_port' | 'listen_port' | 'type' | 'memory'>
> & {
  id: string;
  external_address: string;
  external_port: number;
  environmentVariables?: Array<Pick<CustomEnvironmentVariable, 'key' | 'value'>>;
};

export interface ReverseProxyServerStatus {
  phase: 'Pending' | 'Running' | 'Failed';
  message?: string;
  apiKey?: string;
  internalId?: string;
  lastSyncedAt?: string;
}

export interface ReverseProxyServerCRD extends CustomResource {
  spec: ReverseProxyServerSpec;
  status?: ReverseProxyServerStatus;
}

export type EnvironmentVariable = Pick<CustomEnvironmentVariable, 'key' | 'value'>; 