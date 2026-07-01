import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.stockAdjustment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log("Seeding organization...");
  const org = await prisma.organization.create({
    data: {
      name: "Acme Corp",
    },
  });

  console.log("Seeding products...");
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Classic Denim Jacket",
        sku: "APP-DEN-001",
        description: "Vintage wash unisex denim jacket with metal buttons.",
        price: 79.99,
        stock: 12,
        lowStockAlert: 5,
        category: "Apparel",
        organizationId: org.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Premium Cotton T-Shirt",
        sku: "APP-TSH-002",
        description: "100% organic cotton crew neck t-shirt in off-white.",
        price: 24.99,
        stock: 45,
        lowStockAlert: 10,
        category: "Apparel",
        organizationId: org.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Wireless Charging Pad",
        sku: "ELE-WCP-003",
        description: "Fast 15W Qi-certified wireless charger with LED indicator.",
        price: 34.99,
        stock: 3, // Low stock
        lowStockAlert: 5,
        category: "Electronics",
        organizationId: org.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Ergonomic Office Chair",
        sku: "HOM-OFC-004",
        description: "Breathable mesh back chair with lumbar support.",
        price: 189.99,
        stock: 8,
        lowStockAlert: 3,
        category: "Home",
        organizationId: org.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Matte Clay Pomade",
        sku: "BEA-POM-005",
        description: "Strong hold, matte finish styling pomade for men.",
        price: 18.50,
        stock: 1, // Low stock
        lowStockAlert: 5,
        category: "Beauty",
        organizationId: org.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Stainless Steel Water Bottle",
        sku: "HOM-BOT-006",
        description: "Double-walled vacuum insulated bottle, 750ml.",
        price: 29.99,
        stock: 25,
        lowStockAlert: 5,
        category: "Home",
        organizationId: org.id,
      },
    }),
  ]);

  console.log("Seeding customers...");
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Sarah Jenkins",
        email: "sarah.j@example.com",
        phone: "+15550192834",
        address: "123 Maple St, Seattle, WA 98101",
        organizationId: org.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: "Marcus Aurelius",
        email: "marcus.a@example.com",
        phone: "+15550293847",
        address: "456 Roman Way, Austin, TX 78701",
        organizationId: org.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: "Elena Rostova",
        email: "elena.r@example.com",
        phone: "+15550384756",
        address: "789 Pine Ave, Chicago, IL 60601",
        organizationId: org.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: "David Kim",
        email: "david.k@example.com",
        phone: "+15550475621",
        address: "101 Oak Rd, San Francisco, CA 94102",
        organizationId: org.id,
      },
    }),
  ]);

  console.log("Seeding orders & items...");
  // Order 1: Delivered, Instagram, Sarah Jenkins
  const o1 = await prisma.order.create({
    data: {
      orderNumber: "ORD-10001",
      customerId: customers[0].id,
      source: "INSTAGRAM",
      status: "DELIVERED",
      totalAmount: 104.98,
      notes: "Customer asked to drop at front porch.",
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      organizationId: org.id,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o1.id,
      productId: products[0].id, // Denim Jacket
      quantity: 1,
      priceAtOrder: 79.99,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o1.id,
      productId: products[1].id, // Cotton T-Shirt
      quantity: 1,
      priceAtOrder: 24.99,
    },
  });

  // Order 2: Shipped, WhatsApp, Marcus Aurelius
  const o2 = await prisma.order.create({
    data: {
      orderNumber: "ORD-10002",
      customerId: customers[1].id,
      source: "WHATSAPP",
      status: "SHIPPED",
      totalAmount: 249.97,
      notes: "Wants gift wrapping if possible.",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      organizationId: org.id,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o2.id,
      productId: products[1].id, // Cotton T-Shirt
      quantity: 2,
      priceAtOrder: 24.99,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o2.id,
      productId: products[0].id, // Denim Jacket
      quantity: 1,
      priceAtOrder: 79.99,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o2.id,
      productId: products[3].id, // Office Chair
      quantity: 1,
      priceAtOrder: 120.00, // Discounted
    },
  });

  // Order 3: Processing, Facebook, Elena Rostova
  const o3 = await prisma.order.create({
    data: {
      orderNumber: "ORD-10003",
      customerId: customers[2].id,
      source: "FACEBOOK",
      status: "PROCESSING",
      totalAmount: 34.99,
      notes: "Confirming address before dispatch.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      organizationId: org.id,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o3.id,
      productId: products[2].id, // Wireless Pad
      quantity: 1,
      priceAtOrder: 34.99,
    },
  });

  // Order 4: Ordered, Phone, Walk-in (No customer)
  const o4 = await prisma.order.create({
    data: {
      orderNumber: "ORD-10004",
      source: "PHONE",
      status: "ORDERED",
      totalAmount: 18.50,
      notes: "Will pick up from the store directly.",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      organizationId: org.id,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o4.id,
      productId: products[4].id, // Matte Clay
      quantity: 1,
      priceAtOrder: 18.50,
    },
  });

  // Order 5: Cancelled, Walk-in, David Kim
  const o5 = await prisma.order.create({
    data: {
      orderNumber: "ORD-10005",
      customerId: customers[3].id,
      source: "WALK_IN",
      status: "CANCELLED",
      totalAmount: 59.98,
      notes: "Returned on the spot due to incorrect item size.",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      organizationId: org.id,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o5.id,
      productId: products[5].id, // Water Bottle
      quantity: 2,
      priceAtOrder: 29.99,
    },
  });

  // Order 6: Delivered, WhatsApp, Sarah Jenkins (Second Order)
  const o6 = await prisma.order.create({
    data: {
      orderNumber: "ORD-10006",
      customerId: customers[0].id,
      source: "WHATSAPP",
      status: "DELIVERED",
      totalAmount: 54.98,
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      organizationId: org.id,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o6.id,
      productId: products[1].id, // Cotton T-Shirt
      quantity: 1,
      priceAtOrder: 24.99,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: o6.id,
      productId: products[5].id, // Water Bottle
      quantity: 1,
      priceAtOrder: 29.99,
    },
  });

  console.log("Seeding stock adjustments...");
  await Promise.all([
    prisma.stockAdjustment.create({
      data: {
        productId: products[0].id,
        quantityChange: 15,
        reason: "Initial Stocking",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[0].id,
        quantityChange: -1,
        reason: "Order ORD-10001",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[0].id,
        quantityChange: -1,
        reason: "Order ORD-10002",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[1].id,
        quantityChange: 50,
        reason: "Initial Stocking",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[1].id,
        quantityChange: -1,
        reason: "Order ORD-10001",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[1].id,
        quantityChange: -2,
        reason: "Order ORD-10002",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[1].id,
        quantityChange: -1,
        reason: "Order ORD-10006",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[1].id,
        quantityChange: -1,
        reason: "Damaged packaging in warehouse",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[2].id,
        quantityChange: 4,
        reason: "Initial Stocking",
        organizationId: org.id,
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        productId: products[2].id,
        quantityChange: -1,
        reason: "Order ORD-10003",
        organizationId: org.id,
      },
    }),
  ]);

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
