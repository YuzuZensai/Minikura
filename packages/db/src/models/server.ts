import type {
  CustomEnvironmentVariable,
  Prisma,
  Server as PrismaServer,
} from "../generated/prisma";

export type ServerWithEnvVars = Prisma.ServerGetPayload<{
  include: { env_variables: true };
}>;

export type ServerCreateInput = Prisma.ServerCreateInput;

export type ServerUpdateInput = Prisma.ServerUpdateInput;

export type EnvVariable = Pick<CustomEnvironmentVariable, "key" | "value">;

export type Server = PrismaServer;
