import type { UpdateSuspensionInput, UpdateUserInput, User } from "@minikura/db";
import { BusinessRuleError, NotFoundError } from "../../domain/errors/base.error";
import {
  UserSuspendedEvent,
  UserUnsuspendedEvent,
} from "../../domain/events/server-lifecycle.events";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { eventBus } from "../../infrastructure/event-bus";

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    return this.userRepo.update(id, input);
  }

  async updateSuspension(id: string, input: UpdateSuspensionInput): Promise<User> {
    const user = await this.userRepo.updateSuspension(id, input);
    if (input.isSuspended) {
      const suspendedUntil = input.suspendedUntil instanceof Date ? input.suspendedUntil : null;
      await eventBus.publish(new UserSuspendedEvent(id, suspendedUntil));
    } else {
      await eventBus.publish(new UserUnsuspendedEvent(id));
    }
    return user;
  }

  async suspendUser(id: string, suspendedUntil?: Date | null): Promise<User> {
    return this.updateSuspension(id, {
      isSuspended: true,
      suspendedUntil: suspendedUntil ?? null,
    });
  }

  async unsuspendUser(id: string): Promise<User> {
    return this.updateSuspension(id, {
      isSuspended: false,
      suspendedUntil: null,
    });
  }

  async deleteUser(requestingUserId: string, targetUserId: string): Promise<void> {
    if (requestingUserId === targetUserId) {
      throw new BusinessRuleError("Cannot delete yourself");
    }
    await this.userRepo.delete(targetUserId);
  }
}
