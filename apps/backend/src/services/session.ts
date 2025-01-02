import { prisma } from "@minikura/db";
import crypto from "node:crypto";

export namespace SessionService {
  export enum SESSION_STATUS {
    VALID = "VALID",
    INVALID = "INVALID",
    REVOKED = "REVOKED",
    EXPIRED = "EXPIRED",
  }

  export async function validate(token: string) {
    const session = await prisma.session.findUnique({
      where: {
        token,
      },
    });

    if (!session) {
      return {
        status: SESSION_STATUS.INVALID,
        session: null,
      };
    }

    if (session.revoked) {
      return {
        status: SESSION_STATUS.REVOKED,
        session,
      };
    }

    if (session.expires_at < new Date()) {
      return {
        status: SESSION_STATUS.EXPIRED,
        session,
      };
    }

    return {
      status: SESSION_STATUS.VALID,
      session,
    };
  }

  export async function validateApiKey(apiKey: string) {
    // If starts with "minikura_reverse_proxy_server_api_key_"
    if (apiKey.startsWith("minikura_reverse_proxy_server_api_key_")) {
      const reverseProxyServer = await prisma.reverseProxyServer.findUnique({
        where: {
          api_key: apiKey,
        },
      });

      if (!reverseProxyServer) {
        return {
          status: SESSION_STATUS.INVALID,
          session: null,
        };
      }

      return {
        status: SESSION_STATUS.VALID,
        server: reverseProxyServer,
      };
    }

    if (apiKey.startsWith("minikura_server_api_key_")) {
      const server = await prisma.server.findUnique({
        where: {
          api_key: apiKey,
        },
      });

      if (!server) {
        return {
          status: SESSION_STATUS.INVALID,
          session: null,
        };
      }

      return {
        status: SESSION_STATUS.VALID,
        server: server,
      };
    }

    return {
      status: SESSION_STATUS.INVALID,
      session: null,
    };
  }

  export async function create(userId: string) {
    let token = crypto.randomBytes(64).toString("hex");
    token = token
      .split("")
      .map((char) => (Math.random() > 0.5 ? char.toUpperCase() : char))
      .join("");
    token = `minikura_user_session_${token}`;

    return await prisma.session.create({
      data: {
        token,
        user: {
          connect: {
            id: userId,
          },
        },
        // Expires in 48 hours
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
  }

  export async function revoke(token: string) {
    return await prisma.session.update({
      where: {
        token,
      },
      data: {
        revoked: true,
      },
    });
  }
}
