import { describe, it, expect, vi, beforeEach } from "vitest";
import { adjustStock, getStockAdjustments, getLowStockProducts } from "@/app/actions/inventory";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("mock-org-id"),
}));

describe("inventory server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("adjustStock", () => {
    it("should fail if variant is not found", async () => {
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue(null);

      const result = await adjustStock("var-id", 5, "Restock");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Product variant not found");
    });

    it("should fail if stock becomes negative", async () => {
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue({
        id: "var-1",
        stock: 3,
        productId: "prod-1",
        product: { name: "Test Product" },
      } as any);

      const result = await adjustStock("var-1", -5, "Deduct");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot deduct stock below zero");
    });

    it("should successfully adjust variant stock and sync parent stock", async () => {
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue({
        id: "var-1",
        stock: 10,
        productId: "prod-1",
        product: { name: "Test Product" },
      } as any);
      vi.mocked(prisma.productVariant.update).mockResolvedValue({
        id: "var-1",
        stock: 8,
      } as any);
      vi.mocked(prisma.productVariant.findMany).mockResolvedValue([{ stock: 8 }] as any);
      vi.mocked(prisma.product.update).mockResolvedValue({} as any);

      const result = await adjustStock("var-1", -2, "Damaged item");
      expect(result.success).toBe(true);
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: "var-1" },
        data: {
          stock: 8,
          stockAdjustments: {
            create: {
              productId: "prod-1",
              quantityChange: -2,
              reason: "Damaged item",
              organizationId: "mock-org-id",
            },
          },
        },
      });
    });
  });

  describe("getStockAdjustments", () => {
    it("should fetch stock adjustments history ordered desc", async () => {
      const mockAdjustments = [{ id: "adj-1", quantityChange: 10 }];
      vi.mocked(prisma.stockAdjustment.findMany).mockResolvedValue(mockAdjustments as any);

      const result = await getStockAdjustments();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAdjustments);
    });
  });

  describe("getLowStockProducts", () => {
    it("should filter products that are at or below low stock alert threshold", async () => {
      const mockProducts = [
        { id: "p1", stock: 2, lowStockAlert: 5 }, // Low stock (2 <= 5)
        { id: "p2", stock: 10, lowStockAlert: 5 }, // Healthy (10 > 5)
        { id: "p3", stock: 5, lowStockAlert: 5 }, // Borderline Low stock (5 <= 5)
      ];
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);

      const result = await getLowStockProducts();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { id: "p1", stock: 2, lowStockAlert: 5 },
        { id: "p3", stock: 5, lowStockAlert: 5 },
      ]);
    });
  });
});
