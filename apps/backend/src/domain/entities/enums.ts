import {
  MinecraftServerJarType,
  GameMode as PrismaGameMode,
  ServerDifficulty as PrismaServerDifficulty,
  ServerType as PrismaServerType,
  ServiceType as PrismaServiceType,
  ReverseProxyServerType,
} from "@minikura/db";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export const MinecraftJarType = MinecraftServerJarType;
export type MinecraftJarType = (typeof MinecraftJarType)[keyof typeof MinecraftJarType];

export const ReverseProxyType = ReverseProxyServerType;
export type ReverseProxyType = (typeof ReverseProxyType)[keyof typeof ReverseProxyType];

export const ServerType = PrismaServerType;
export type ServerType = (typeof ServerType)[keyof typeof ServerType];

export const ServiceType = PrismaServiceType;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const ServerDifficulty = PrismaServerDifficulty;
export type ServerDifficulty = (typeof ServerDifficulty)[keyof typeof ServerDifficulty];

export const GameMode = PrismaGameMode;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];
