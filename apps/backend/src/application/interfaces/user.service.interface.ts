import type { UpdateSuspensionInput, UpdateUserInput, User } from "@minikura/db";

export interface IUserService {
  getUserById(id: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, input: UpdateUserInput): Promise<User>;
  updateSuspension(id: string, input: UpdateSuspensionInput): Promise<User>;
  suspendUser(id: string, suspendedUntil?: Date | null): Promise<User>;
  unsuspendUser(id: string): Promise<User>;
  deleteUser(requestingUserId: string, targetUserId: string): Promise<void>;
}
