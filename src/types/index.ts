import { Product, Customer, Order, OrderItem, StockAdjustment } from "@prisma/client";

export type OrderSource = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "PHONE" | "WALK_IN";
export type OrderStatus = "ORDERED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type ProductWithAdjustments = Product & {
  stockAdjustments: StockAdjustment[];
};

export type OrderItemWithProduct = OrderItem & {
  product: Product;
};

export type OrderWithRelations = Order & {
  customer: Customer | null;
  items: OrderItemWithProduct[];
};

export type CustomerWithOrders = Customer & {
  orders: Order[];
};

export type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  revenue: number;
  lowStockAlerts: number;
};
