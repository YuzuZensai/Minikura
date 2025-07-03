import { dotenvLoad } from "dotenv-mono";
const dotenv = dotenvLoad();

import { Elysia, error, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { prisma, ServerType } from "@minikura/db";

import { ServerService } from "./services/server";
import { UserService } from "./services/user";
import argon2 from "argon2";
import { SessionService } from "./services/session";

enum ReturnError {
  INVALID_USERNAME_OR_PASSWORD = "INVALID_USERNAME_OR_PASSWORD",
  MISSING_TOKEN = "MISSING_TOKEN",
  REVOKED_TOKEN = "REVOKED_TOKEN",
  EXPIRED_TOKEN = "EXPIRED_TOKEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  SERVER_NAME_IN_USE = "SERVER_NAME_IN_USE",
  SERVER_NOT_FOUND = "SERVER_NOT_FOUND",
}

const bootstrap = async () => {
  const users = await prisma.user.findMany();
  if (users.length !== 0) {
    return;
  }

  await prisma.user.create({
    data: {
      username: "admin",
      password: await argon2.hash("admin"),
    },
  });

  console.log("Default user created");
};


const connectedClients = new Set<any>();
const broadcastServerChange = (action: string, serverType: string, serverId: string) => {
  const message = {
    type: "SERVER_CHANGE",
    action,
    serverType,
    serverId,
    timestamp: new Date().toISOString(),
  };
  
  connectedClients.forEach(client => {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      connectedClients.delete(client);
    }
  });
  console.log(`Notified Velocity proxy: ${action} ${serverType} ${serverId}`);
};

const app = new Elysia()
  .use(swagger({
    path: '/swagger',
    documentation: {
      info: {
        title: 'Minikura API Documentation',
        version: '1.0.0'
      }
    }
  }))
  .ws("/ws", {
    open(ws) {
      const apiKey = ws.data.query.apiKey;
      if (!apiKey) {
        console.log("apiKey required");
        ws.close();
        return;
      }
      
      connectedClients.add(ws);
      console.log("Velocity proxy connected via WebSocket");
    },
    close(ws) {
      connectedClients.delete(ws);
      console.log("Velocity proxy disconnected from WebSocket");
    },
    message(ws, message) {
      console.log("Received message from Velocity proxy:", message);
    },
  })
  .group('/api', app => app
    .derive(async ({ headers, cookie: { session_token }, path }) => {
      // Skip token validation for login route
      if (path === '/api/login') {
        return {
          server: null,
          session: null,
        };
      }

      const auth = session_token.value;
      const token = headers.authorization?.split(" ")[1];

      if (!auth && !token)
        return error("Unauthorized", {
          success: false,
          message: ReturnError.MISSING_TOKEN,
        });

      if (auth) {
        const session = await SessionService.validate(auth);
        if (session.status === SessionService.SESSION_STATUS.REVOKED) {
          return error("Unauthorized", {
            success: false,
            message: ReturnError.REVOKED_TOKEN,
          });
        }
        if (session.status === SessionService.SESSION_STATUS.EXPIRED) {
          return error("Unauthorized", {
            success: false,
            message: ReturnError.EXPIRED_TOKEN,
          });
        }
        if (
          session.status === SessionService.SESSION_STATUS.INVALID ||
          session.status !== SessionService.SESSION_STATUS.VALID ||
          !session.session
        ) {
          return error("Unauthorized", {
            success: false,
            message: ReturnError.INVALID_TOKEN,
          });
        }

        return {
          server: null,
          session: session.session,
        };
      }

      if (token) {
        const session = await SessionService.validateApiKey(token);
        if (session.status === SessionService.SESSION_STATUS.INVALID) {
          return error("Unauthorized", {
            success: false,
            message: ReturnError.INVALID_TOKEN,
          });
        }
        if (
          session.status === SessionService.SESSION_STATUS.VALID &&
          session.server
        ) {
          return {
            session: null,
            server: session.server,
          };
        }
      }

      // Should never reach here
      return error("Unauthorized", {
        success: false,
        message: ReturnError.INVALID_TOKEN,
      });
    })
    .post(
      "/login",
      async ({ body, cookie: { session_token } }) => {
        const user = await UserService.getUserByUsername(body.username);
        const valid = await argon2.verify(user?.password || "fake", body.password);

        if (!user || !valid) {
          return error("Unauthorized", {
            success: false,
            message: ReturnError.INVALID_USERNAME_OR_PASSWORD,
          });
        }

        const session = await SessionService.create(user.id);

        session_token.httpOnly = true;
        session_token.value = session.token;

        return {
          success: true,
        };
      },
      {
        body: t.Object({
          username: t.String({ minLength: 1 }),
          password: t.String({ minLength: 1 }),
        }),
      }
    )
    .post("/logout", async ({ session, cookie: { session_token } }) => {
      if (!session) return { success: true };

      await SessionService.revoke(session.token);

      session_token.remove();

      return {
        success: true,
      };
    })
    .get("/servers", async ({ session }) => {
      // Broadcast to all connected WebSocket clients
      const message = {
        type: "test",
        endpoint: "/servers",
        timestamp: new Date().toISOString(),
      };
      
      connectedClients.forEach(client => {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
          connectedClients.delete(client);
        }
      });
      
      console.log(`/servers API called, notified ${connectedClients.size} WebSocket clients`);
      
      return await ServerService.getAllServers(!session);
    })
    .get("/servers/:id", async ({ session, params: { id } }) => {
      return await ServerService.getServerById(id, !session);
    })
    .post(
      "/servers",
      async ({ body, error }) => {
        // Must be a-z, A-Z, 0-9, and -_ only
        if (!/^[a-zA-Z0-9-_]+$/.test(body.id)) {
          return error("Bad Request", "ID must be a-z, A-Z, 0-9, and -_ only");
        }

        const _server = await ServerService.getServerById(body.id);
        if (_server) {
          return error("Conflict", {
            success: false,
            message: ReturnError.SERVER_NAME_IN_USE,
          });
        }

        const server = await ServerService.createServer({
          id: body.id,
          description: body.description,
          listen_port: body.listen_port,
          type: body.type,
          env_variables: body.env_variables,
          memory: body.memory,
        });

        broadcastServerChange("CREATE", "SERVER", server.id,);

        return {
          success: true,
          data: {
            server,
          },
        };
      },
      {
        body: t.Object({
          id: t.String({ minLength: 1 }),
          description: t.Nullable(t.String({ minLength: 1 })),
          listen_port: t.Integer({ minimum: 1, maximum: 65535 }),
          type: t.Enum(ServerType),
          env_variables: t.Optional(t.Array(t.Object({
            key: t.String({ minLength: 1 }),
            value: t.String(),
          }))),
          memory: t.Optional(t.String({ minLength: 1 })),
        }),
      }
    )
    .patch(
      "/servers/:id",
      async ({ session, params: { id }, body }) => {
        const server = await ServerService.getServerById(id);
        if (!server) {
          return error("Not Found", {
            success: false,
            message: ReturnError.SERVER_NOT_FOUND,
          });
        }

        // Create update data with only fields that exist in the model
        const data: any = {};
        
        if (body.description !== undefined) data.description = body.description;
        if (body.listen_port !== undefined) data.listen_port = body.listen_port;
        if (body.memory !== undefined) data.memory = body.memory;
        // Don't allow service_type to be updated through API

        await prisma.server.update({
          where: { id },
          data,
        });

        const newServer = await ServerService.getServerById(id, !session);

        broadcastServerChange("UPDATE", "SERVER", server.id);

        return {
          success: true,
          data: {
            server: newServer,
          },
        };
      },
      {
        body: t.Object({
          description: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
          listen_port: t.Optional(t.Integer({ minimum: 1, maximum: 65535 })),
          memory: t.Optional(t.String({ minLength: 1 })),
        }),
      }
    )
    .delete("/servers/:id", async ({ params: { id } }) => {
      const server = await ServerService.getServerById(id);
      if (!server) {
        return error("Not Found", {
          success: false,
          message: ReturnError.SERVER_NOT_FOUND,
        });
      }

      await prisma.server.delete({
        where: { id },
      });

      broadcastServerChange("DELETE", "SERVER", server.id);

      return {
        success: true,
      };
    })
    .get("/reverse_proxy_servers", async ({ session }) => {
      return await ServerService.getAllReverseProxyServers(!session);
    })
    .post(
      "/reverse_proxy_servers",
      async ({ body, error }) => {
        // Must be a-z, A-Z, 0-9, and -_ only
        if (!/^[a-zA-Z0-9-_]+$/.test(body.id)) {
          return error("Bad Request", "ID must be a-z, A-Z, 0-9, and -_ only");
        }

        const _server = await ServerService.getReverseProxyServerById(body.id);
        if (_server) {
          return error("Conflict", {
            success: false,
            message: ReturnError.SERVER_NAME_IN_USE,
          });
        }

        const server = await ServerService.createReverseProxyServer({
          id: body.id,
          description: body.description,
          external_address: body.external_address,
          external_port: body.external_port,
          listen_port: body.listen_port,
          type: body.type,
          env_variables: body.env_variables,
          memory: body.memory,
        });

        broadcastServerChange("CREATE", "REVERSE_PROXY_SERVER", server.id);

        return {
          success: true,
          data: {
            server,
          },
        };
      },
      {
        body: t.Object({
          id: t.String({ minLength: 1 }),
          description: t.Nullable(t.String({ minLength: 1 })),
          external_address: t.String({ minLength: 1 }),
          external_port: t.Integer({ minimum: 1, maximum: 65535 }),
          listen_port: t.Optional(t.Integer({ minimum: 1, maximum: 65535 })),
          type: t.Optional(t.Enum({ VELOCITY: "VELOCITY", BUNGEECORD: "BUNGEECORD" })),
          env_variables: t.Optional(t.Array(t.Object({
            key: t.String({ minLength: 1 }),
            value: t.String(),
          }))),
          memory: t.Optional(t.String({ minLength: 1 })),
        }),
      }
    )
    .patch(
      "/reverse_proxy_servers/:id",
      async ({ session, params: { id }, body }) => {
        const server = await prisma.reverseProxyServer.findUnique({
          where: { id },
        });
        if (!server) {
          return error("Not Found", {
            success: false,
            message: ReturnError.SERVER_NOT_FOUND,
          });
        }

        // Create update data with only fields that exist in the model
        const data: any = {};
        
        if (body.description !== undefined) data.description = body.description;
        if (body.external_address !== undefined) data.external_address = body.external_address;
        if (body.external_port !== undefined) data.external_port = body.external_port;
        if (body.listen_port !== undefined) data.listen_port = body.listen_port;
        if (body.type !== undefined) data.type = body.type;
        if (body.memory !== undefined) data.memory = body.memory;
        // Don't allow service_type to be updated through API

        await prisma.reverseProxyServer.update({
          where: { id },
          data,
        });

        const newServer = await ServerService.getReverseProxyServerById(
          id,
          !session
        );

        broadcastServerChange("UPDATE", "REVERSE_PROXY_SERVER", server.id);

        return {
          success: true,
          data: {
            server: newServer,
          },
        };
      },
      {
        body: t.Object({
          description: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
          external_address: t.Optional(t.String({ minLength: 1 })),
          external_port: t.Optional(t.Integer({ minimum: 1, maximum: 65535 })),
          listen_port: t.Optional(t.Integer({ minimum: 1, maximum: 65535 })),
          type: t.Optional(t.Enum({ VELOCITY: "VELOCITY", BUNGEECORD: "BUNGEECORD" })),
          memory: t.Optional(t.String({ minLength: 1 })),
        }),
      }
    )
    .delete("/reverse_proxy_servers/:id", async ({ params: { id } }) => {
      const server = await prisma.reverseProxyServer.findUnique({
        where: { id },
      });
      if (!server) {
        return error("Not Found", {
          success: false,
          message: ReturnError.SERVER_NOT_FOUND,
        });
      }

      await prisma.reverseProxyServer.delete({
        where: { id },
      });

      broadcastServerChange("DELETE", "REVERSE_PROXY_SERVER", server.id);

      return {
        success: true,
      };
    })
    .get("/servers/:id/env", async ({ params: { id } }) => {
      const server = await ServerService.getServerById(id);
      if (!server) {
        return error("Not Found", {
          success: false,
          message: ReturnError.SERVER_NOT_FOUND,
        });
      }
      
      return {
        success: true,
        data: {
          env_variables: server.env_variables,
        },
      };
    })
    .post(
      "/servers/:id/env",
      async ({ params: { id }, body }) => {
        const server = await ServerService.getServerById(id);
        if (!server) {
          return error("Not Found", {
            success: false,
            message: ReturnError.SERVER_NOT_FOUND,
          });
        }
        
        const envVar = await prisma.customEnvironmentVariable.upsert({
          where: {
            key_server_id: {
              key: body.key,
              server_id: id,
            },
          },
          update: {
            value: body.value,
          },
          create: {
            key: body.key,
            value: body.value,
            server_id: id,
          },
        });
        
        return {
          success: true,
          data: {
            env_var: envVar,
          },
        };
      },
      {
        body: t.Object({
          key: t.String({ minLength: 1 }),
          value: t.String(),
        }),
      }
    )
    .delete("/servers/:id/env/:key", async ({ params: { id, key } }) => {
      const server = await ServerService.getServerById(id);
      if (!server) {
        return error("Not Found", {
          success: false,
          message: ReturnError.SERVER_NOT_FOUND,
        });
      }
      
      try {
        await prisma.customEnvironmentVariable.delete({
          where: {
            key_server_id: {
              key,
              server_id: id,
            },
          },
        });
        
        return {
          success: true,
        };
      } catch (err) {
        return error("Not Found", {
          success: false,
          message: "Environment variable not found",
        });
      }
    })
    .get("/reverse_proxy_servers/:id/env", async ({ params: { id } }) => {
      const server = await ServerService.getReverseProxyServerById(id);
      if (!server) {
        return error("Not Found", {
          success: false,
          message: ReturnError.SERVER_NOT_FOUND,
        });
      }
      
      return {
        success: true,
        data: {
          env_variables: server.env_variables,
        },
      };
    })
    .post(
      "/reverse_proxy_servers/:id/env",
      async ({ params: { id }, body }) => {
        const server = await ServerService.getReverseProxyServerById(id);
        if (!server) {
          return error("Not Found", {
            success: false,
            message: ReturnError.SERVER_NOT_FOUND,
          });
        }
        
        const envVar = await prisma.customEnvironmentVariable.upsert({
          where: {
            key_reverse_proxy_id: {
              key: body.key,
              reverse_proxy_id: id,
            },
          },
          update: {
            value: body.value,
          },
          create: {
            key: body.key,
            value: body.value,
            reverse_proxy_id: id,
          },
        });
        
        return {
          success: true,
          data: {
            env_var: envVar,
          },
        };
      },
      {
        body: t.Object({
          key: t.String({ minLength: 1 }),
          value: t.String(),
        }),
      }
    )
    .delete("/reverse_proxy_servers/:id/env/:key", async ({ params: { id, key } }) => {
      const server = await ServerService.getReverseProxyServerById(id);
      if (!server) {
        return error("Not Found", {
          success: false,
          message: ReturnError.SERVER_NOT_FOUND,
        });
      }
      
      try {
        await prisma.customEnvironmentVariable.delete({
          where: {
            key_reverse_proxy_id: {
              key,
              reverse_proxy_id: id,
            },
          },
        });
        
        return {
          success: true,
        };
      } catch (err) {
        return error("Not Found", {
          success: false,
          message: "Environment variable not found",
        });
      }
    })
  )
  .listen(3000, async () => {
    console.log("Server is running on port 3000");
    bootstrap();
  });

export type App = typeof app;
