import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProduct, updateProduct, deleteProduct, getProducts } from "@/app/actions/products";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("mock-org-id"),
}));

describe("products server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should fetch all products when no search query is provided", async () => {
      const mockProducts = [
        { id: "1", name: "Product A", sku: "SKU-A", price: 10, stock: 5 },
      ];
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);

      const result = await getProducts();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "mock-org-id",
        },
        include: {
          variants: {
            include: {
              attributeValues: {
                include: {
                  attribute: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter products by search query", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      const result = await getProducts("test");
      expect(result.success).toBe(true);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "mock-org-id",
          OR: [
            { name: { contains: "test", mode: "insensitive" } },
            { sku: { contains: "test", mode: "insensitive" } },
            { category: { contains: "test", mode: "insensitive" } },
          ],
        },
        include: {
          variants: {
            include: {
              attributeValues: {
                include: {
                  attribute: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("createProduct", () => {
    it("should fail if SKU already exists", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: "1" } as any);
      const result = await createProduct({
        name: "New Product",
        sku: "existing-sku",
        price: 10,
        category: "Test",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("already in use");
    });

    it("should successfully create product and fallback to master variant", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.product.create).mockResolvedValue({ id: "2", name: "P", sku: "NEW-SKU" } as any);
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productVariant.create).mockResolvedValue({ id: "v-2", stock: 0 } as any);

      const result = await createProduct({
        name: "New Product",
        sku: "new-sku",
        price: 10,
        category: "Test",
      });

      expect(result.success).toBe(true);
      expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: "New Product",
          sku: "NEW-SKU",
          stock: 0,
          organizationId: "mock-org-id",
        }),
      }));
    });
  });

  describe("updateProduct", () => {
    it("should fail if product does not exist", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productVariant.findMany).mockResolvedValue([]);

      const result = await updateProduct("non-existent-id", {
        name: "Updated",
        sku: "SKU-UPD",
        price: 10,
        category: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });

    it("should update product and sync default variant stock change", async () => {
      vi.mocked(prisma.product.findFirst)
        .mockResolvedValueOnce(null) // check conflicting SKU -> null
        .mockResolvedValueOnce({ id: "1", stock: 10 } as any); // current state
      
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productVariant.findMany).mockResolvedValue([{ id: "v-1", stock: 10 }] as any);
      vi.mocked(prisma.productVariant.update).mockResolvedValue({ id: "v-1", stock: 12 } as any);
      vi.mocked(prisma.product.update).mockResolvedValue({ id: "1" } as any);

      const result = await updateProduct("1", {
        name: "Updated",
        sku: "SKU-UPD",
        price: 15,
        category: "Test",
        variants: [
          {
            id: "v-1",
            sku: "SKU-UPD",
            barcode: "",
            price: 15,
            purchasePrice: null,
            stock: 12, // stock changed by +2
            status: "ACTIVE",
            attributeValueMap: {},
          }
        ],
      });

      expect(result.success).toBe(true);
      expect(prisma.productVariant.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "v-1" },
        data: expect.objectContaining({
          stock: 12,
        }),
      }));
    });
  });

  describe("deleteProduct", () => {
    it("should call prisma delete and return success", async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: "1" } as any);
      vi.mocked(prisma.product.delete).mockResolvedValue({ id: "1" } as any);

      const result = await deleteProduct("1");
      expect(result.success).toBe(true);
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });
  });
});
