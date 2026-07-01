import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder, updateOrderStatus, getOrders } from "@/app/actions/orders";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("mock-org-id"),
}));

describe("orders server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrders", () => {
    it("should fetch all orders with relations", async () => {
      const mockOrders = [{ id: "order-1", orderNumber: "ORD-10001" }];
      vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);

      const result = await getOrders();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrders);
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          organizationId: "mock-org-id",
        },
      }));
    });
  });

  describe("createOrder", () => {
    it("should fail if order items are empty", async () => {
      const result = await createOrder({
        source: "WHATSAPP",
        status: "ORDERED",
        items: [],
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("at least one item");
    });

    it("should fail if product variant does not exist", async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue(null);

      const result = await createOrder({
        source: "WHATSAPP",
        status: "ORDERED",
        items: [{ productId: "p1", productVariantId: "v1", quantity: 2 }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product variant not found");
    });

    it("should fail if stock is insufficient", async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue({
        id: "v1",
        stock: 1,
        product: { name: "Test Product", price: 50 },
      } as any);

      const result = await createOrder({
        source: "WHATSAPP",
        status: "ORDERED",
        items: [{ productId: "p1", productVariantId: "v1", quantity: 2 }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");
    });

    it("should successfully create order, deduct variant stock, and sync parent stock", async () => {
      vi.mocked(prisma.order.findFirst)
        .mockResolvedValueOnce({ orderNumber: "ORD-10006" } as any)
        .mockResolvedValueOnce(null);
      
      vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: "cust-1" } as any);
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValue({
        id: "v1",
        productId: "p1",
        stock: 10,
        price: 15.5,
        product: { id: "p1", name: "Test Product", price: 15.5 },
      } as any);

      vi.mocked(prisma.productVariant.findMany).mockResolvedValue([{ stock: 8 }] as any);
      vi.mocked(prisma.productVariant.update).mockResolvedValue({} as any);
      vi.mocked(prisma.product.update).mockResolvedValue({} as any);
      vi.mocked(prisma.order.create).mockResolvedValue({
        id: "new-order-id",
        orderNumber: "ORD-10007",
      } as any);

      const result = await createOrder({
        customerId: "cust-1",
        source: "WHATSAPP",
        status: "ORDERED",
        items: [{ productId: "p1", productVariantId: "v1", quantity: 2 }],
      });

      expect(result.success).toBe(true);
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: "v1" },
        data: {
          stock: { decrement: 2 },
          stockAdjustments: {
            create: {
              productId: "p1",
              quantityChange: -2,
              reason: "Order Created (ORD-10007)",
              organizationId: "mock-org-id",
            },
          },
        },
      });
    });
  });
});
