import { dotenvLoad } from "dotenv-mono";

const _dotenv = dotenvLoad();

import { prisma } from "@minikura/db";
import { ENABLE_CRD_REFLECTION, NAMESPACE } from "./config/constants";
import { ReverseProxyController } from "./controllers/reverse-proxy-controller";
import { ServerController } from "./controllers/server-controller";
import { setupCRDRegistration } from "./utils/crd-registrar";
import { KubernetesClient } from "./utils/k8s-client";
import { logger } from "./utils/logger";

async function main() {
  logger.info(
    { namespace: NAMESPACE, crdReflection: ENABLE_CRD_REFLECTION },
    "Starting Minikura Kubernetes Operator"
  );

  try {
    const k8sClient = KubernetesClient.getInstance();
    logger.info({ namespace: NAMESPACE }, "Successfully connected to Kubernetes cluster");

    const serverController = new ServerController(prisma, NAMESPACE);
    const reverseProxyController = new ReverseProxyController(prisma, NAMESPACE);

    serverController.startWatching();
    reverseProxyController.startWatching();

    if (ENABLE_CRD_REFLECTION) {
      logger.info("CRD reflection enabled - will create Custom Resources to mirror database state");
      try {
        await setupCRDRegistration(prisma, k8sClient, NAMESPACE);
        logger.info("CRD registration completed successfully");
      } catch (error: any) {
        logger.error(
          {
            err: error,
            message: error.message,
            statusCode: error.response?.statusCode,
            body: error.response?.body,
          },
          "Failed to setup CRD registration, continuing without CRD reflection"
        );
        logger.warn(
          "Kubernetes resources (Deployments, Services) will still be created, but Custom Resources will not be reflected"
        );
      }
    }

    logger.info("Minikura Kubernetes Operator is now running and watching for changes");

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);

    function gracefulShutdown() {
      logger.info("Received shutdown signal, shutting down gracefully");
      serverController.stopWatching();
      reverseProxyController.stopWatching();
      prisma.$disconnect();
      logger.info("All resources released, exiting process");
      process.exit(0);
    }
  } catch (error: any) {
    logger.fatal(
      {
        err: error,
        message: error.message,
        statusCode: error.response?.statusCode,
        body: error.response?.body,
        stack: error.stack,
      },
      "Failed to start Minikura Kubernetes Operator"
    );
    process.exit(1);
  }
}

main().catch((error) => {
  logger.fatal({ err: error }, "Unhandled error in main process");
  process.exit(1);
});
