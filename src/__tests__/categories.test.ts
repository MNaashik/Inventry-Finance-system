import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCategories, upsertCategory, deleteCategory } from "@/app/actions/categories";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("mock-org-id"),
}));

describe("categories server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCategories", () => {
    it("should fetch all categories with attributes and options sorted", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Clothing",
          attributes: [
            {
              id: "attr-1",
              name: "Size",
              type: "DROPDOWN",
              options: [{ id: "opt-1", value: "XL", position: 0 }],
            },
          ],
        },
      ];
      vi.mocked(prisma.category.findMany).mockResolvedValue(mockCategories as any);

      const result = await getCategories();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { organizationId: "mock-org-id" },
        include: {
          attributes: {
            include: {
              options: {
                orderBy: { position: "asc" },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("upsertCategory", () => {
    it("should fail if category name is empty", async () => {
      const result = await upsertCategory(null, "", []);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Category name is required");
    });

    it("should fail if attribute name is empty", async () => {
      const result = await upsertCategory(null, "Apparel", [
        { name: "", type: "TEXT", options: [] },
      ]);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Attribute names are required");
    });

    it("should fail if dropdown attribute has no options", async () => {
      const result = await upsertCategory(null, "Apparel", [
        { name: "Size", type: "DROPDOWN", options: [] },
      ]);
      expect(result.success).toBe(false);
      expect(result.error).toContain("requires at least one option");
    });

    it("should fail if dropdown has duplicate option values", async () => {
      const result = await upsertCategory(null, "Apparel", [
        { name: "Size", type: "DROPDOWN", options: ["S", "s"] },
      ]);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Duplicate option values are not allowed");
    });

    it("should fail if category name conflicts", async () => {
      vi.mocked(prisma.category.findFirst).mockResolvedValue({ id: "cat-1", name: "Clothing" } as any);
      const result = await upsertCategory(null, "Clothing", []);
      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("should successfully create category and attributes", async () => {
      vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.category.create).mockResolvedValue({ id: "cat-new", name: "Electronics" } as any);
      vi.mocked(prisma.categoryAttribute.create).mockResolvedValue({ id: "attr-new" } as any);

      const result = await upsertCategory(null, "Electronics", [
        { name: "RAM", type: "TEXT", options: [] },
        { name: "Warranty", type: "DROPDOWN", options: ["1 Year", "2 Years"] },
      ]);

      expect(result.success).toBe(true);
    });
  });

  describe("deleteCategory", () => {
    it("should fail if category not found", async () => {
      vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
      const result = await deleteCategory("cat-nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Category not found");
    });

    it("should successfully delete category", async () => {
      vi.mocked(prisma.category.findFirst).mockResolvedValue({ id: "cat-1" } as any);
      vi.mocked(prisma.category.delete).mockResolvedValue({ id: "cat-1" } as any);

      const result = await deleteCategory("cat-1");
      expect(result.success).toBe(true);
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: "cat-1" },
      });
    });
  });
});
