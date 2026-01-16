import { API_GROUP, API_VERSION, RESOURCE_TYPES } from "../config/constants";

export const MINECRAFT_SERVER_CRD = {
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: {
    name: `${RESOURCE_TYPES.MINECRAFT_SERVER.plural}.${API_GROUP}`,
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
                required: ["id", "type", "listen_port"],
                properties: {
                  id: {
                    type: "string",
                    pattern: "^[a-zA-Z0-9-_]+$",
                    description: "ID of the Minecraft server",
                  },
                  description: {
                    type: "string",
                    nullable: true,
                    description: "Optional description of the server",
                  },
                  listen_port: {
                    type: "integer",
                    minimum: 1,
                    maximum: 65535,
                    description: "Port the server listens on",
                  },
                  type: {
                    type: "string",
                    enum: ["STATEFUL", "STATELESS"],
                    description: "Type of the server",
                  },
                  memory: {
                    type: "string",
                    nullable: true,
                    default: "1G",
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
      singular: RESOURCE_TYPES.MINECRAFT_SERVER.singular,
      plural: RESOURCE_TYPES.MINECRAFT_SERVER.plural,
      kind: RESOURCE_TYPES.MINECRAFT_SERVER.kind,
      shortNames: RESOURCE_TYPES.MINECRAFT_SERVER.shortNames,
    },
  },
};
