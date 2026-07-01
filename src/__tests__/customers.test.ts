import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCustomers, getCustomerDetails, createCustomer, updateCustomer } from "@/app/actions/customers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("mock-org-id"),
}));

describe("customers server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCustomers", () => {
    it("should fetch all customers and parse stats", async () => {
      const mockCustomers = [
        {
          id: "c1",
          name: "Alice",
          email: "alice@example.com",
          phone: "123",
          address: "Addr",
          orders: [
            { id: "o1", totalAmount: 100, status: "DELIVERED" },
            { id: "o2", totalAmount: 50, status: "CANCELLED" },
          ],
        },
      ];
      vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers as any);

      const result = await getCustomers();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        expect.objectContaining({
          id: "c1",
          ordersCount: 2,
          totalSpent: 100, // o2 is CANCELLED so totalSpent is just o1 (100)
        }),
      ]);
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "mock-org-id",
        },
        include: {
          orders: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("getCustomerDetails", () => {
    it("should return error if customer not found", async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);

      const result = await getCustomerDetails("non-existent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Customer not found");
    });

    it("should fetch customer details and calculate totalSpent", async () => {
      const mockCustomer = {
        id: "c1",
        name: "Alice",
        orders: [
          { id: "o1", totalAmount: 150, status: "PROCESSING", items: [] },
          { id: "o2", totalAmount: 200, status: "SHIPPED", items: [] },
        ],
      };
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(mockCustomer as any);

      const result = await getCustomerDetails("c1");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: "c1",
        totalSpent: 350,
        ordersCount: 2,
      }));
    });
  });

  describe("createCustomer", () => {
    it("should create new customer record", async () => {
      vi.mocked(prisma.customer.create).mockResolvedValue({
        id: "c2",
        name: "Bob",
        email: "bob@example.com",
        phone: null,
        address: null,
      } as any);

      const result = await createCustomer({
        name: "Bob",
        email: "bob@example.com",
      });

      expect(result.success).toBe(true);
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: {
          name: "Bob",
          email: "bob@example.com",
          phone: null,
          address: null,
          organizationId: "mock-org-id",
        },
      });
    });
  });

  describe("updateCustomer", () => {
    it("should update existing customer details", async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue({
        id: "c2",
        name: "Bob",
        email: "bob@example.com",
        phone: null,
        address: null,
        organizationId: "mock-org-id",
      } as any);

      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: "c2",
        name: "Bob Updated",
        email: "bob@example.com",
        phone: "555",
        address: "New address",
      } as any);

      const result = await updateCustomer("c2", {
        name: "Bob Updated",
        phone: "555",
        address: "New address",
      });

      expect(result.success).toBe(true);
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: "c2" },
        data: {
          name: "Bob Updated",
          email: null,
          phone: "555",
          address: "New address",
        },
      });
    });
  });
});

