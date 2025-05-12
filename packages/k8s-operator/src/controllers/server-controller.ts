import { PrismaClient, ServerType } from '@minikura/db';
import type { Server, CustomEnvironmentVariable } from '@minikura/db';
import { BaseController } from './base-controller';
import type { ServerConfig } from '../types';
import { createServer, deleteServer } from '../resources/server';

type ServerWithEnvVars = Server & {
  env_variables: CustomEnvironmentVariable[];
};

export class ServerController extends BaseController {
  private deployedServers = new Map<string, ServerWithEnvVars>();

  constructor(prisma: PrismaClient, namespace: string) {
    super(prisma, namespace);
  }

  protected getControllerName(): string {
    return 'ServerController';
  }

  protected async syncResources(): Promise<void> {
    try {
      const appsApi = this.k8sClient.getAppsApi();
      const coreApi = this.k8sClient.getCoreApi();
      const networkingApi = this.k8sClient.getNetworkingApi();

      const servers = await this.prisma.server.findMany({
        include: {
          env_variables: true,
        }
      }) as ServerWithEnvVars[];
      
      const currentServerIds = new Set(servers.map(server => server.id));
      
      // Delete servers that are no longer in the database
      for (const [serverId, server] of this.deployedServers.entries()) {
        if (!currentServerIds.has(serverId)) {
          console.log(`Server ${server.id} (${serverId}) has been removed from the database, deleting from Kubernetes...`);
          await deleteServer(serverId, server.id, appsApi, coreApi, this.namespace);
          this.deployedServers.delete(serverId);
        }
      }
      
      // Create or update servers that are in the database
      for (const server of servers) {
        const deployedServer = this.deployedServers.get(server.id);
        
        // If server doesn't exist yet or has been updated
        if (!deployedServer || this.hasServerChanged(deployedServer, server)) {
          console.log(`${!deployedServer ? 'Creating' : 'Updating'} server ${server.id} (${server.id}) in Kubernetes...`);
          
          const serverConfig: ServerConfig = {
            id: server.id,
            type: server.type,
            apiKey: server.api_key,
            description: server.description,
            listen_port: server.listen_port,
            memory: server.memory,
            env_variables: server.env_variables?.map(ev => ({
              key: ev.key,
              value: ev.value
            }))
          };
          
          await createServer(
            serverConfig, 
            appsApi, 
            coreApi, 
            networkingApi, 
            this.namespace
          );
          
          // Update cache
          this.deployedServers.set(server.id, { ...server });
        }
      }
    } catch (error) {
      console.error('Error syncing servers:', error);
      throw error;
    }
  }

  private hasServerChanged(
    oldServer: ServerWithEnvVars, 
    newServer: ServerWithEnvVars
  ): boolean {
    // Check basic properties
    const basicPropsChanged = 
      oldServer.type !== newServer.type ||
      oldServer.listen_port !== newServer.listen_port ||
      oldServer.description !== newServer.description;
    
    if (basicPropsChanged) return true;
    
    // Check if environment variables have changed
    const oldEnvVars = oldServer.env_variables || [];
    const newEnvVars = newServer.env_variables || [];
    
    // Check if the number of env vars has changed
    if (oldEnvVars.length !== newEnvVars.length) return true;
    
    // Check if any of the existing env vars have changed
    for (const newEnv of newEnvVars) {
      const oldEnv = oldEnvVars.find(e => e.key === newEnv.key);
      if (!oldEnv || oldEnv.value !== newEnv.value) {
        return true;
      }
    }
    
    return false;
  }
} 