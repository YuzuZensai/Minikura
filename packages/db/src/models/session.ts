import type { Prisma, Session as PrismaSession } from "../generated/prisma";

export type Session = PrismaSession;

export type SessionWithUser = Prisma.SessionGetPayload<{
  include: { user: true };
}>;

export function isSessionExpired(session: Pick<Session, "expiresAt">): boolean {
  return session.expiresAt < new Date();
}
