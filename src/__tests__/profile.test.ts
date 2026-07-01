import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProfileSettings } from "@/app/actions/profile";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma");
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentProfile: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    name: "Original Name",
    avatarUrl: null,
  }),
}));

describe("profile server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProfileSettings", () => {
    it("should successfully update profile name and avatarUrl", async () => {
      vi.mocked(prisma.profile.update).mockResolvedValue({
        id: "user-1",
        name: "New Name",
        avatarUrl: "data:image/png;base64,...",
      } as any);

      const result = await updateProfileSettings({
        name: "New Name",
        avatarUrl: "data:image/png;base64,...",
      });

      expect(result.success).toBe(true);
      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          name: "New Name",
          avatarUrl: "data:image/png;base64,...",
        },
      });
    });

    it("should fail if not authenticated", async () => {
      const authMock = await import("@/lib/auth");
      vi.mocked(authMock.getCurrentProfile).mockResolvedValueOnce(null);

      const result = await updateProfileSettings({
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });
  });
});
