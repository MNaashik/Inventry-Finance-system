import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.cashBookEntry.findMany({
    orderBy: [
      { date: "asc" },
      { createdAt: "asc" }
    ],
  });

  console.log("-----------------------------------------");
  console.log("All Cash Book Entries:");
  console.log("-----------------------------------------");
  for (const entry of entries) {
    console.log({
      id: entry.id,
      date: entry.date.toISOString().split("T")[0],
      description: entry.description,
      type: entry.type,
      debit: entry.debit,
      credit: entry.credit,
      amount: entry.amount,
      runningBalance: entry.runningBalance,
      sourceModule: entry.sourceModule,
      createdAt: entry.createdAt.toISOString(),
    });
  }
  console.log("-----------------------------------------");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
