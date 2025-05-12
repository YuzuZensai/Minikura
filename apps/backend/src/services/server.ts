import { prisma } from "@minikura/db";
import type { ServerType } from "@minikura/db";
import crypto from "node:crypto";

export namespace ServerService {
  export async function getAllServers(omitSensitive = false) {
    if (omitSensitive) {
      return await prisma.server.findMany({
        select: {
          id: true,
          type: true,
          description: true,
          listen_port: true,
          memory: true,
          created_at: true,
          updated_at: true,
          env_variables: true,
        },
      });
    } else {
      return await prisma.server.findMany({
        include: {
          env_variables: true,
        },
      });
    }
  }

  export async function getAllReverseProxyServers(omitSensitive = false) {
    if (omitSensitive) {
      return await prisma.reverseProxyServer.findMany({
        select: {
          id: true,
          type: true,
          description: true,
          external_address: true,
          external_port: true,
          listen_port: true,
          memory: true,
          created_at: true,
          updated_at: true,
          env_variables: true,
        },
      });
    } else {
      return await prisma.reverseProxyServer.findMany({
        include: {
          env_variables: true,
        },
      });
    }
  }

  export async function getServerById(id: string, omitSensitive = false) {
    if (omitSensitive) {
      return await prisma.server.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          description: true,
          listen_port: true,
          memory: true,
          created_at: true,
          updated_at: true,
          env_variables: true,
        },
      });
    } else {
      return await prisma.server.findUnique({
        where: { id },
        include: {
          env_variables: true,
        },
      });
    }
  }

  export async function getReverseProxyServerById(
    id: string,
    omitSensitive = false
  ) {
    if (omitSensitive) {
      return await prisma.reverseProxyServer.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          description: true,
          external_address: true,
          external_port: true,
          listen_port: true,
          memory: true,
          created_at: true,
          updated_at: true,
          env_variables: true,
        },
      });
    } else {
      return await prisma.reverseProxyServer.findUnique({
        where: { id },
        include: {
          env_variables: true,
        },
      });
    }
  }

  export async function createReverseProxyServer({
    id,
    description,
    external_address,
    external_port,
    listen_port,
    type,
    env_variables,
    memory,
  }: {
    id: string;
    description: string | null;
    external_address: string;
    external_port: number;
    listen_port?: number;
    type?: "VELOCITY" | "BUNGEECORD";
    env_variables?: { key: string; value: string }[];
    memory?: string;
  }) {
    let token = crypto.randomBytes(64).toString("hex");
    token = token
      .split("")
      .map((char) => (Math.random() > 0.5 ? char.toUpperCase() : char))
      .join("");
    token = `minikura_reverse_proxy_server_api_key_${token}`;

    return await prisma.reverseProxyServer.create({
      data: {
        id,
        description,
        external_address,
        external_port,
        listen_port: listen_port || 25565,
        type: type || "VELOCITY",
        api_key: token,
        memory: memory || "512M",
        env_variables: env_variables ? {
          create: env_variables.map(ev => ({
            key: ev.key,
            value: ev.value
          }))
        } : undefined,
      },
      include: {
        env_variables: true,
      }
    });
  }

  export async function createServer({
    id,
    description,
    type,
    listen_port,
    env_variables,
    memory,
  }: {
    id: string;
    description: string | null;
    type: ServerType;
    listen_port: number;
    env_variables?: { key: string; value: string }[];
    memory?: string;
  }) {
    let token = crypto.randomBytes(64).toString("hex");
    token = token
      .split("")
      .map((char) => (Math.random() > 0.5 ? char.toUpperCase() : char))
      .join("");
    token = `minikura_server_api_key_${token}`;

    return await prisma.server.create({
      data: {
        id,
        description,
        type,
        listen_port,
        api_key: token,
        memory: memory || "1G",
        env_variables: env_variables ? {
          create: env_variables.map(ev => ({
            key: ev.key,
            value: ev.value
          }))
        } : undefined,
      },
      include: {
        env_variables: true,
      }
    });
  }
  
  export async function setServerEnvironmentVariable(
    serverId: string,
    key: string,
    value: string
  ) {
    // Upsert pattern - create if doesn't exist, update if it does
    return await prisma.customEnvironmentVariable.upsert({
      where: {
        key_server_id: {
          key,
          server_id: serverId,
        },
      },
      update: {
        value,
      },
      create: {
        key,
        value,
        server_id: serverId,
      },
    });
  }
  
  export async function setReverseProxyEnvironmentVariable(
    proxyId: string,
    key: string,
    value: string
  ) {
    // Upsert pattern - create if doesn't exist, update if it does
    return await prisma.customEnvironmentVariable.upsert({
      where: {
        key_reverse_proxy_id: {
          key,
          reverse_proxy_id: proxyId,
        },
      },
      update: {
        value,
      },
      create: {
        key,
        value,
        reverse_proxy_id: proxyId,
      },
    });
  }
  
  export async function deleteServerEnvironmentVariable(
    serverId: string,
    key: string
  ) {
    return await prisma.customEnvironmentVariable.delete({
      where: {
        key_server_id: {
          key,
          server_id: serverId,
        },
      },
    });
  }
  
  export async function deleteReverseProxyEnvironmentVariable(
    proxyId: string,
    key: string
  ) {
    return await prisma.customEnvironmentVariable.delete({
      where: {
        key_reverse_proxy_id: {
          key,
          reverse_proxy_id: proxyId,
        },
      },
    });
  }
}
