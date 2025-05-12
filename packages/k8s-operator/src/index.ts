import { dotenvLoad } from "dotenv-mono";
const dotenv = dotenvLoad();

import { NAMESPACE, KUBERNETES_NAMESPACE_ENV, ENABLE_CRD_REFLECTION } from './config/constants';
import { prisma } from "@minikura/db";
import { KubernetesClient } from './utils/k8s-client';
import { ServerController } from './controllers/server-controller';
import { ReverseProxyController } from './controllers/reverse-proxy-controller';
import { setupCRDRegistration } from './utils/crd-registrar';

async function main() {
  console.log('Starting Minikura Kubernetes Operator...');
  console.log(`Using namespace: ${NAMESPACE}`);
  
  try {
    const k8sClient = KubernetesClient.getInstance();
    console.log('Connected to Kubernetes cluster');

    const serverController = new ServerController(prisma, NAMESPACE);
    const reverseProxyController = new ReverseProxyController(prisma, NAMESPACE);
  
    serverController.startWatching();
    reverseProxyController.startWatching();

    if (ENABLE_CRD_REFLECTION) {
      console.log('CRD reflection enabled - will create CRDs to reflect database state');
      try {
        await setupCRDRegistration(prisma, k8sClient, NAMESPACE);
      } catch (error: any) {
        console.error(`Failed to set up CRD registration: ${error.message}`);
        if (error.response) {
          console.error(`Response status: ${error.response.statusCode}`);
          console.error(`Response body: ${JSON.stringify(error.response.body)}`);
        }
        console.error('Continuing operation without CRD reflection');
        console.log('Kubernetes resources will still be created/updated, but CRD reflection is disabled');
      }
    }
    
    console.log('Minikura Kubernetes Operator is running');
    
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    
    function gracefulShutdown() {
      console.log('Shutting down operator gracefully...');
      serverController.stopWatching();
      reverseProxyController.stopWatching();
      prisma.$disconnect();
      console.log('Resources released, exiting...');
      process.exit(0);
    }
    
  } catch (error: any) {
    console.error(`Failed to start Minikura Kubernetes Operator: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.statusCode}`);
      console.error(`Response body: ${JSON.stringify(error.response.body)}`);
    }
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 