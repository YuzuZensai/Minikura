import type {
  CustomEnvironmentVariable,
  Prisma,
  ReverseProxyServer as PrismaReverseProxyServer,
} from "../generated/prisma";

export type ReverseProxyWithEnvVars = Prisma.ReverseProxyServerGetPayload<{
  include: { env_variables: true };
}>;

export type ReverseProxyCreateInput = Prisma.ReverseProxyServerCreateInput;

export type ReverseProxyUpdateInput = Prisma.ReverseProxyServerUpdateInput;

export type ReverseProxyServer = PrismaReverseProxyServer;
