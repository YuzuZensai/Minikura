import { describe, it, expect, beforeEach, mock } from "bun:test";
import { SessionService } from "../session";

// Create mock functions
const mockSessionFindUnique = mock();
const mockServerFindUnique = mock();
const mockReverseProxyFindUnique = mock();
const mockIsUserSuspended = mock();

// Mock the prisma client
mock.module("@minikura/db", () => ({
  prisma: {
    session: {
      findUnique: mockSessionFindUnique,
    },
    server: {
      findUnique: mockServerFindUnique,
    },
    reverseProxyServer: {
      findUnique: mockReverseProxyFindUnique,
    },
  },
  isUserSuspended: mockIsUserSuspended,
}));

// Import mocked modules
await import("@minikura/db");

describe("SessionService", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockClear();
    mockServerFindUnique.mockClear();
    mockReverseProxyFindUnique.mockClear();
    mockIsUserSuspended.mockClear();
  });

  describe("validate", () => {
    it("should return INVALID for non-existent session", async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      const result = await SessionService.validate("invalid-token");

      expect(result.status).toBe(SessionService.SESSION_STATUS.INVALID);
      expect(result.session).toBeNull();
    });

    it("should return EXPIRED for expired session", async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockSessionFindUnique.mockResolvedValue({
        id: "session-1",
        token: "token-1",
        expiresAt: expiredDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        userId: "user-1",
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          image: null,
          role: "user",
          isSuspended: false,
          suspendedUntil: null,
        },
      });

      const result = await SessionService.validate("expired-token");

      expect(result.status).toBe(SessionService.SESSION_STATUS.EXPIRED);
    });

    it("should return USER_SUSPENDED for suspended user", async () => {
      const futureDate = new Date(Date.now() + 1000000);
      mockIsUserSuspended.mockReturnValue(true);

      mockSessionFindUnique.mockResolvedValue({
        id: "session-1",
        token: "token-1",
        expiresAt: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        userId: "user-1",
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          image: null,
          role: "user",
          isSuspended: true,
          suspendedUntil: null,
        },
      });

      const result = await SessionService.validate("valid-token");

      expect(result.status).toBe(SessionService.SESSION_STATUS.USER_SUSPENDED);
    });

    it("should return VALID for valid session with active user", async () => {
      const futureDate = new Date(Date.now() + 1000000);
      mockIsUserSuspended.mockReturnValue(false);

      mockSessionFindUnique.mockResolvedValue({
        id: "session-1",
        token: "token-1",
        expiresAt: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        userId: "user-1",
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          image: null,
          role: "user",
          isSuspended: false,
          suspendedUntil: null,
        },
      });

      const result = await SessionService.validate("valid-token");

      expect(result.status).toBe(SessionService.SESSION_STATUS.VALID);
      expect(result.session).toBeDefined();
    });

    it("should handle temporary suspension correctly", async () => {
      const futureDate = new Date(Date.now() + 1000000);
      const pastSuspensionDate = new Date(Date.now() - 1000);

      // User was suspended but suspension has expired
      mockIsUserSuspended.mockReturnValue(false);

      mockSessionFindUnique.mockResolvedValue({
        id: "session-1",
        token: "token-1",
        expiresAt: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        userId: "user-1",
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          image: null,
          role: "user",
          isSuspended: true,
          suspendedUntil: pastSuspensionDate,
        },
      });

      const result = await SessionService.validate("valid-token");

      expect(result.status).toBe(SessionService.SESSION_STATUS.VALID);
    });
  });

  describe("validateApiKey", () => {
    it("should return INVALID for invalid API key format", async () => {
      const result = await SessionService.validateApiKey("invalid-key");

      expect(result.status).toBe(SessionService.SESSION_STATUS.INVALID);
      expect(result.server).toBeNull();
    });

    it("should return INVALID when reverse proxy server not found", async () => {
      mockReverseProxyFindUnique.mockResolvedValue(null);

      const result = await SessionService.validateApiKey(
        "minikura_reverse_proxy_server_api_key_invalid"
      );

      expect(result.status).toBe(SessionService.SESSION_STATUS.INVALID);
      expect(result.server).toBeNull();
    });

    it("should return valid reverse proxy server for valid API key", async () => {
      const mockServer = {
        id: "server-1",
        subdomain: "test",
        api_key: "minikura_reverse_proxy_server_api_key_valid",
        type: "VELOCITY",
        description: null,
        memory: "1G",
        external_address: "test.example.com",
        external_port: 25565,
        listen_port: 25577,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReverseProxyFindUnique.mockResolvedValue(mockServer);

      const result = await SessionService.validateApiKey(
        "minikura_reverse_proxy_server_api_key_valid"
      );

      expect(result.status).toBe(SessionService.SESSION_STATUS.VALID);
      expect(result.server?.id).toBe(mockServer.id);
    });

    it("should return valid server for valid server API key", async () => {
      const mockServer = {
        id: "server-1",
        name: "Test Server",
        api_key: "minikura_server_api_key_valid",
        type: "STATEFUL",
        description: null,
        memory: "2G",
        listen_port: 25565,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockServerFindUnique.mockResolvedValue(mockServer);

      const result = await SessionService.validateApiKey("minikura_server_api_key_valid");

      expect(result.status).toBe(SessionService.SESSION_STATUS.VALID);
      expect(result.server?.id).toBe(mockServer.id);
    });
  });
});
