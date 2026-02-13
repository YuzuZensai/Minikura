import { LABEL_PREFIX } from "./constants";

export const labelKeys = {
  serverType: `${LABEL_PREFIX}/server-type`,
  serverId: `${LABEL_PREFIX}/server-id`,
  proxyId: `${LABEL_PREFIX}/proxy-id`,
  restartAt: `${LABEL_PREFIX}/restart-at`,
  databaseManaged: `${LABEL_PREFIX}/database-managed`,
  lastSynced: `${LABEL_PREFIX}/last-synced`,
} as const;
