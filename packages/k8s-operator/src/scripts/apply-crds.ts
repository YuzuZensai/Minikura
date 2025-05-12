import { KubernetesClient } from '../utils/k8s-client';
import { registerRBACResources } from '../utils/rbac-registrar';
import { setupCRDRegistration } from '../utils/crd-registrar';
import { NAMESPACE } from '../config/constants';
import { PrismaClient } from '@minikura/db';
import { dotenvLoad } from 'dotenv-mono';

dotenvLoad();

async function main() {
  console.log('Starting to apply TypeScript-defined CRDs to Kubernetes cluster...');
  
  try {
    const k8sClient = KubernetesClient.getInstance();
    console.log(`Connected to Kubernetes cluster, using namespace: ${NAMESPACE}`);

    await registerRBACResources(k8sClient);
    
    console.log('Registering Custom Resource Definitions...');
    const prisma = new PrismaClient();
    await setupCRDRegistration(prisma, k8sClient, NAMESPACE);
    
    console.log('Successfully applied all resources to Kubernetes cluster');
    process.exit(0);
  } catch (error: any) {
    console.error('Failed to apply resources:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 