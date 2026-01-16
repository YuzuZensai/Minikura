import { API_GROUP, API_VERSION, RESOURCE_TYPES } from "../config/constants";

export const REVERSE_PROXY_SERVER_CRD = {
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: {
    name: `${RESOURCE_TYPES.REVERSE_PROXY_SERVER.plural}.${API_GROUP}`,
  },
  spec: {
    group: API_GROUP,
    versions: [
      {
        name: API_VERSION,
        served: true,
        storage: true,
        schema: {
          openAPIV3Schema: {
            type: "object",
            properties: {
              spec: {
                type: "object",
                required: ["id", "external_address", "external_port"],
                properties: {
                  id: {
                    type: "string",
                    pattern: "^[a-zA-Z0-9-_]+$",
                    description: "ID of the reverse proxy server",
                  },
                  description: {
                    type: "string",
                    nullable: true,
                    description: "Optional description of the server",
                  },
                  external_address: {
                    type: "string",
                    description: "External address of the proxy server",
                  },
                  external_port: {
                    type: "integer",
                    minimum: 1,
                    maximum: 65535,
                    description: "External port of the proxy server",
                  },
                  listen_port: {
                    type: "integer",
                    minimum: 1,
                    maximum: 65535,
                    default: 25565,
                    nullable: true,
                    description: "Port the proxy server listens on internally",
                  },
                  type: {
                    type: "string",
                    enum: ["VELOCITY", "BUNGEECORD"],
                    default: "VELOCITY",
                    nullable: true,
                    description: "Type of the reverse proxy server",
                  },
                  memory: {
                    type: "string",
                    default: "512M",
                    nullable: true,
                    description: "Memory allocation for the server",
                  },
                  environmentVariables: {
                    type: "array",
                    nullable: true,
                    items: {
                      type: "object",
                      required: ["key", "value"],
                      properties: {
                        key: {
                          type: "string",
                          description: "Environment variable key",
                        },
                        value: {
                          type: "string",
                          description: "Environment variable value",
                        },
                      },
                    },
                  },
                },
              },
              status: {
                type: "object",
                nullable: true,
                properties: {
                  phase: {
                    type: "string",
                    enum: ["Pending", "Running", "Failed"],
                    description: "Current phase of the server",
                  },
                  message: {
                    type: "string",
                    nullable: true,
                    description: "Detailed message about the current status",
                  },
                  apiKey: {
                    type: "string",
                    nullable: true,
                    description: "API key for server communication",
                  },
                  internalId: {
                    type: "string",
                    nullable: true,
                    description: "Internal ID assigned by Minikura",
                  },
                  lastSyncedAt: {
                    type: "string",
                    nullable: true,
                    description: "Last time the server was synced with Kubernetes",
                  },
                },
              },
            },
          },
        },
        additionalPrinterColumns: [
          {
            name: "Type",
            type: "string",
            jsonPath: ".spec.type",
          },
          {
            name: "External Address",
            type: "string",
            jsonPath: ".spec.external_address",
          },
          {
            name: "External Port",
            type: "integer",
            jsonPath: ".spec.external_port",
          },
          {
            name: "Status",
            type: "string",
            jsonPath: ".status.phase",
          },
          {
            name: "Age",
            type: "date",
            jsonPath: ".metadata.creationTimestamp",
          },
        ],
      },
    ],
    scope: "Namespaced",
    names: {
      singular: RESOURCE_TYPES.REVERSE_PROXY_SERVER.singular,
      plural: RESOURCE_TYPES.REVERSE_PROXY_SERVER.plural,
      kind: RESOURCE_TYPES.REVERSE_PROXY_SERVER.kind,
      shortNames: RESOURCE_TYPES.REVERSE_PROXY_SERVER.shortNames,
    },
  },
};
