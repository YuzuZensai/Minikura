import { prisma } from "@minikura/db";
import type { ServerType } from "@minikura/db";
import crypto from "node:crypto";

export namespace ServerService {
  export async function getAllServers(omitSensitive = false) {
    return await prisma.server.findMany({
      omit: {
        api_key: omitSensitive,
      },
    });
  }

  export async function getAllReverseProxyServers(omitSensitive = false) {
    return await prisma.reverseProxyServer.findMany({
      omit: {
        api_key: omitSensitive,
      },
    });
  }

  export async function getServerById(id: string, omitSensitive = false) {
    return await prisma.server.findUnique({
      where: { id },
      omit: {
        api_key: omitSensitive,
      },
    });
  }

  export async function getReverseProxyServerById(
    id: string,
    omitSensitive = false
  ) {
    return await prisma.reverseProxyServer.findUnique({
      where: { id },
      omit: {
        api_key: omitSensitive,
      },
    });
  }

  export async function getServerByName(name: string, omitSensitive = false) {
    return await prisma.server.findUnique({
      where: { name },
      omit: {
        api_key: omitSensitive,
      },
    });
  }

  export async function getReverseProxyServerByName(
    name: string,
    omitSensitive = false
  ) {
    return await prisma.reverseProxyServer.findUnique({
      where: { name },
      omit: {
        api_key: omitSensitive,
      },
    });
  }

  export async function createReverseProxyServer({
    name,
    description,
    address,
    port,
  }: {
    name: string;
    description: string | null;
    address: string;
    port: number;
  }) {
    let token = crypto.randomBytes(64).toString("hex");
    token = token
      .split("")
      .map((char) => (Math.random() > 0.5 ? char.toUpperCase() : char))
      .join("");
    token = `minikura_reverse_proxy_server_api_key_${token}`;

    return await prisma.reverseProxyServer.create({
      data: {
        name,
        description,
        address,
        port,
        api_key: token,
      },
    });
  }

  export async function createServer({
    name,
    description,
    address,
    port,
    type,
    join_priority,
  }: {
    name: string;
    description: string | null;
    address: string;
    port: number;
    type: ServerType;
    join_priority: number | null;
  }) {
    let token = crypto.randomBytes(64).toString("hex");
    token = token
      .split("")
      .map((char) => (Math.random() > 0.5 ? char.toUpperCase() : char))
      .join("");
    token = `minikura_server_api_key_${token}`;

    return await prisma.server.create({
      data: {
        name,
        description,
        address,
        port,
        type,
        api_key: token,
        join_priority,
      },
    });
  }
}
