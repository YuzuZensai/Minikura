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

const app = new Elysia()
  .use(swagger())
  .ws("/ws", {
    body: t.Object({
      message: t.String(),
    }),
    // query: t.Object({
    //   id: t.String(),
    // }),
    message(ws, { message }) {
      const { id } = ws.data.query;
      ws.send({
        id,
        message,
        time: Date.now(),
      });
    },
  })
  .post(
    "/login",
    async ({ body, cookie: { session_token } }) => {
      const user = await UserService.getUserByUsername(body.username);

      if (!user) {
        // Fake hash to prevent timing attacks
        const FAKE_HASH =
          "$argon2id$v=19$m=65536,t=3,p=4$PMqZArEBmfkHPbPv7Z50KQ$miV6tIIXU6w2WWOGLbWrdan8TGMTUsS1A1hy9RrpS9Y";
        await argon2.verify(FAKE_HASH, "fake");

        return error("Unauthorized", {
          success: false,
          message: ReturnError.INVALID_USERNAME_OR_PASSWORD,
        });
      }

      const valid = await argon2.verify(user.password, body.password);
      if (!valid) {
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
  .derive(async ({ headers, cookie: { session_token } }) => {
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
  .post("/logout", async ({ session, cookie: { session_token } }) => {
    if (!session) return { success: true };

    await SessionService.revoke(session.token);

    session_token.remove();

    return {
      success: true,
    };
  })
  .get("/servers", async ({ session }) => {
    return await ServerService.getAllServers(!session);
  })
  .get("/servers/:id", async ({ session, params: { id } }) => {
    return await ServerService.getServerById(id, !session);
  })
  .post(
    "/servers",
    async ({ body, error }) => {
      // Must be a-z, A-Z, 0-9, and -_ only
      if (!/^[a-zA-Z0-9-_]+$/.test(body.name)) {
        return error("Bad Request", "Name must be a-z, A-Z, 0-9, and -_ only");
      }

      const _server = await ServerService.getServerByName(body.name);
      if (_server) {
        return error("Conflict", {
          success: false,
          message: ReturnError.SERVER_NAME_IN_USE,
        });
      }

      const server = await ServerService.createServer({
        name: body.name,
        description: body.description,
        address: body.address,
        port: body.port,
        type: body.type,
        join_priority: body.join_priority,
      });

      return {
        success: true,
        data: {
          server,
        },
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Nullable(t.String({ minLength: 1 })),
        address: t.String({ minLength: 1 }),
        port: t.Integer({ minimum: 1, maximum: 65535 }),
        type: t.Enum(ServerType),
        join_priority: t.Nullable(t.Integer({ minimum: 0 })),
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

      if (body.name) {
        const _server = await ServerService.getServerByName(body.name);
        if (_server && _server.id !== id) {
          return error("Conflict", {
            success: false,
            message: ReturnError.SERVER_NAME_IN_USE,
          });
        }
      }

      const data = {
        name: body.name,
        description: body.description,
        address: body.address,
        port: body.port,
        join_priority: body.join_priority,
      };

      await prisma.server.update({
        where: { id },
        data,
      });

      const newServer = await ServerService.getServerById(id, !session);

      return {
        success: true,
        data: {
          server: newServer,
        },
      };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
        address: t.Optional(t.String({ minLength: 1 })),
        port: t.Optional(t.Integer({ minimum: 1, maximum: 65535 })),
        join_priority: t.Optional(t.Integer({ minimum: 0 })),
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
      if (!/^[a-zA-Z0-9-_]+$/.test(body.name)) {
        return error("Bad Request", "Name must be a-z, A-Z, 0-9, and -_ only");
      }

      const _server = await ServerService.getReverseProxyServerByName(
        body.name
      );
      if (_server) {
        return error("Conflict", {
          success: false,
          message: ReturnError.SERVER_NAME_IN_USE,
        });
      }

      const server = await ServerService.createReverseProxyServer({
        name: body.name,
        address: body.address,
        port: body.port,
        description: body.description,
      });

      return {
        success: true,
        data: {
          server,
        },
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Nullable(t.String({ minLength: 1 })),
        address: t.String({ minLength: 1 }),
        port: t.Integer({ minimum: 1, maximum: 65535 }),
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

      if (body.name) {
        const _server = await ServerService.getServerByName(body.name);
        if (_server && _server.id !== id) {
          return error("Conflict", {
            success: false,
            message: ReturnError.SERVER_NAME_IN_USE,
          });
        }
      }

      const data = {
        name: body.name,
        description: body.description,
        address: body.address,
        port: body.port,
      };

      await prisma.reverseProxyServer.update({
        where: { id },
        data,
      });

      const newServer = await ServerService.getReverseProxyServerById(
        id,
        !session
      );

      return {
        success: true,
        data: {
          server: newServer,
        },
      };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
        address: t.Optional(t.String({ minLength: 1 })),
        port: t.Optional(t.Integer({ minimum: 1, maximum: 65535 })),
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

    return {
      success: true,
    };
  })
  .listen(3000, async () => {
    console.log("Server is running on port 3000");
    bootstrap();
  });

export type App = typeof app;
