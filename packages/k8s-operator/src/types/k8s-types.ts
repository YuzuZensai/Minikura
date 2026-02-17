import type * as k8s from "@kubernetes/client-node";

export interface K8sApiError extends Error {
  code?: number;
  body?: string;
  headers?: Record<string, string>;
}

export interface CustomResourceResponse<T = unknown> {
  metadata?: k8s.V1ObjectMeta;
  spec?: T;
  status?: Record<string, unknown>;
  body?: CustomResourceResponse<T>;
}

export interface CustomResourceListResponse<T = unknown> {
  items?: CustomResourceResponse<T>[];
  body?: {
    items?: CustomResourceResponse<T>[];
  };
}

export function isK8sApiError(error: unknown): error is K8sApiError {
  return error instanceof Error && ("code" in error || "body" in error || "headers" in error);
}
