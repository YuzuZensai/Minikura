import { PrismaClient } from '@minikura/db';
import type { ReverseProxyServer, CustomEnvironmentVariable } from '@minikura/db';
import { BaseController } from './base-controller';
import type { ReverseProxyConfig } from '../types';
import { createReverseProxyServer, deleteReverseProxyServer } from '../resources/reverseProxyServer';

type ReverseProxyWithEnvVars = ReverseProxyServer & {
  env_variables: CustomEnvironmentVariable[];
};

export class ReverseProxyController extends BaseController {
  private deployedProxies = new Map<string, ReverseProxyWithEnvVars>();

  constructor(prisma: PrismaClient, namespace: string) {
    super(prisma, namespace);
  }

  protected getControllerName(): string {
    return 'ReverseProxyController';
  }

  protected async syncResources(): Promise<void> {
    try {
      const appsApi = this.k8sClient.getAppsApi();
      const coreApi = this.k8sClient.getCoreApi();
      const networkingApi = this.k8sClient.getNetworkingApi();

      const proxies = await this.prisma.reverseProxyServer.findMany({
        include: {
          env_variables: true,
        }
      }) as ReverseProxyWithEnvVars[];
      
      const currentProxyIds = new Set(proxies.map(proxy => proxy.id));
      
      // Delete reverse proxy servers that are no longer in the database
      for (const [proxyId, proxy] of this.deployedProxies.entries()) {
        if (!currentProxyIds.has(proxyId)) {
          console.log(`Reverse proxy server ${proxy.id} (${proxyId}) has been removed from the database, deleting from Kubernetes...`);
          await deleteReverseProxyServer(proxy.id, proxy.type, appsApi, coreApi, this.namespace);
          this.deployedProxies.delete(proxyId);
        }
      }
      
      // Create or update reverse proxy servers that are in the database
      for (const proxy of proxies) {
        const deployedProxy = this.deployedProxies.get(proxy.id);
        
        // If proxy doesn't exist yet or has been updated
        if (!deployedProxy || this.hasProxyChanged(deployedProxy, proxy)) {
          console.log(`${!deployedProxy ? 'Creating' : 'Updating'} reverse proxy server ${proxy.id} (${proxy.id}) in Kubernetes...`);
          
          const proxyConfig: ReverseProxyConfig = {
            id: proxy.id,
            external_address: proxy.external_address,
            external_port: proxy.external_port,
            listen_port: proxy.listen_port,
            description: proxy.description,
            apiKey: proxy.api_key,
            type: proxy.type,
            memory: proxy.memory,
            env_variables: proxy.env_variables?.map(ev => ({
              key: ev.key,
              value: ev.value
            }))
          };
          
          await createReverseProxyServer(
            proxyConfig, 
            appsApi, 
            coreApi, 
            networkingApi, 
            this.namespace
          );
          
          // Update cache
          this.deployedProxies.set(proxy.id, { ...proxy });
        }
      }
    } catch (error) {
      console.error('Error syncing reverse proxy servers:', error);
      throw error;
    }
  }

  private hasProxyChanged(
    oldProxy: ReverseProxyWithEnvVars, 
    newProxy: ReverseProxyWithEnvVars
  ): boolean {
    // Check basic properties
    const basicPropsChanged = 
      oldProxy.external_address !== newProxy.external_address ||
      oldProxy.external_port !== newProxy.external_port ||
      oldProxy.listen_port !== newProxy.listen_port ||
      oldProxy.description !== newProxy.description;
    
    if (basicPropsChanged) return true;
    
    // Check if environment variables have changed
    const oldEnvVars = oldProxy.env_variables || [];
    const newEnvVars = newProxy.env_variables || [];
    
    if (oldEnvVars.length !== newEnvVars.length) return true;
    for (const newEnv of newEnvVars) {
      const oldEnv = oldEnvVars.find(e => e.key === newEnv.key);
      if (!oldEnv || oldEnv.value !== newEnv.value) {
        return true;
      }
    }
    
    return false;
  }
} 