import { beforeEach, describe, expect, it, mock } from "bun:test";
import { UserService } from "../user";

// Create mock functions
const mockFindUnique = mock();
const mockFindMany = mock();
const mockUpdate = mock();
const mockDelete = mock();
const mockIsUserSuspended = mock();

// Mock the prisma client
mock.module("@minikura/db", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
  isUserSuspended: mockIsUserSuspended,
}));

// Import mocked modules
await import("@minikura/db");

describe("UserService", () => {
  beforeEach(() => {
    mockFindUnique.mockClear();
    mockFindMany.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
    mockIsUserSuspended.mockClear();
  });

  describe("getUserByEmail", () => {
    it("should return user when found", async () => {
      const mockUser = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        role: "user",
        banned: false,
        isSuspended: false,
        suspendedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockResolvedValue(mockUser);

      const result = await UserService.getUserByEmail("test@example.com");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await UserService.getUserByEmail("notfound@example.com");

      expect(result).toBeNull();
    });
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      const mockUser = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        role: "user",
        banned: false,
        isSuspended: false,
        suspendedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockResolvedValue(mockUser);

      const result = await UserService.getUserById("user-1");

      expect(result).toEqual(mockUser);
    });
  });

  describe("getAllUsersWithSuspension", () => {
    it("should return all users with suspension info", async () => {
      const mockUsers = [
        {
          id: "user-1",
          name: "User 1",
          email: "user1@example.com",
          emailVerified: true,
          image: null,
          role: "user",
          banned: false,
          isSuspended: false,
          suspendedUntil: null,
          createdAt: new Date(),
        },
        {
          id: "user-2",
          name: "User 2",
          email: "user2@example.com",
          emailVerified: true,
          image: null,
          role: "user",
          banned: false,
          isSuspended: true,
          suspendedUntil: new Date(Date.now() + 86400000),
          createdAt: new Date(),
        },
      ];

      mockFindMany.mockResolvedValue(mockUsers);

      const result = await UserService.getAllUsersWithSuspension();

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });
  });

  describe("updateUser", () => {
    it("should update user basic information", async () => {
      const mockUpdatedUser = {
        id: "user-1",
        name: "Updated Name",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        role: "admin",
        createdAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockUpdatedUser);

      const result = await UserService.updateUser("user-1", {
        name: "Updated Name",
        role: "admin",
      });

      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe("suspendUser", () => {
    it("should suspend user indefinitely when no expiration provided", async () => {
      const mockSuspendedUser = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        role: "user",
        isSuspended: true,
        suspendedUntil: null,
        createdAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockSuspendedUser);

      const result = await UserService.suspendUser("user-1");

      expect(result.isSuspended).toBe(true);
      expect(result.suspendedUntil).toBeNull();
    });

    it("should suspend user until specific date", async () => {
      const suspendUntil = new Date(Date.now() + 86400000); // 1 day from now

      const mockSuspendedUser = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        role: "user",
        isSuspended: true,
        suspendedUntil: suspendUntil,
        createdAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockSuspendedUser);

      const result = await UserService.suspendUser("user-1", suspendUntil);

      expect(result.isSuspended).toBe(true);
      expect(result.suspendedUntil).toEqual(suspendUntil);
    });
  });

  describe("unsuspendUser", () => {
    it("should unsuspend a user", async () => {
      const mockUnsuspendedUser = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        role: "user",
        isSuspended: false,
        suspendedUntil: null,
        createdAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockUnsuspendedUser);

      const result = await UserService.unsuspendUser("user-1");

      expect(result.isSuspended).toBe(false);
      expect(result.suspendedUntil).toBeNull();
    });
  });

  describe("deleteUser", () => {
    it("should delete a user", async () => {
      mockDelete.mockResolvedValue({});

      await UserService.deleteUser("user-1");

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });
  });

  describe("checkSuspension", () => {
    it("should return true when user is suspended", async () => {
      const mockUser = {
        isSuspended: true,
        suspendedUntil: null,
      };

      mockFindUnique.mockResolvedValue(mockUser);
      mockIsUserSuspended.mockReturnValue(true);

      const result = await UserService.checkSuspension("user-1");

      expect(result).toBe(true);
    });

    it("should return false when user is not suspended", async () => {
      const mockUser = {
        isSuspended: false,
        suspendedUntil: null,
      };

      mockFindUnique.mockResolvedValue(mockUser);
      mockIsUserSuspended.mockReturnValue(false);

      const result = await UserService.checkSuspension("user-1");

      expect(result).toBe(false);
    });

    it("should throw error when user not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(UserService.checkSuspension("user-1")).rejects.toThrow("User not found");
    });
  });
});
