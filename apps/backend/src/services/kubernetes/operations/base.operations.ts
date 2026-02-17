import { getErrorMessage } from "@minikura/shared/errors";
import { logger } from "../../../infrastructure/logger";

export abstract class BaseK8sOperations {
  protected namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  protected async executeOperation<T>(
    operation: () => Promise<T>,
    errorContext: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error({ err: error, context: errorContext }, "K8s operation failed");
      throw new Error(`${errorContext}: ${errorMessage}`);
    }
  }

  protected async executeOperationSafe<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    errorContext: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      logger.error({ err: error, context: errorContext }, "K8s operation failed (safe mode)");
      return defaultValue;
    }
  }

  getNamespace(): string {
    return this.namespace;
  }
}
