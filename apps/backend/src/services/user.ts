import { prisma } from "@minikura/db";

export namespace UserService {
  export async function getUserByUsername(username: string) {
    return await prisma.user.findUnique({
      where: { username },
    });
  }
}
