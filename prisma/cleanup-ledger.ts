import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Cash Book ledger cleanup...");

  // Fetch all organizations
  const organizations = await prisma.organization.findMany();
  console.log(`Found ${organizations.length} organizations.`);

  for (const org of organizations) {
    const orgId = org.id;
    console.log(`Processing Org: ${org.name} (${orgId})...`);

    // 1. Group opening entries by account to find duplicates
    const openingEntries = await prisma.cashBookEntry.findMany({
      where: { organizationId: orgId, reference: "OPENING" },
      orderBy: { createdAt: "asc" },
    });

    const bankAccountEntries: Record<string, string[]> = {};
    const cashAccountEntries: Record<string, string[]> = {};

    for (const entry of openingEntries) {
      if (entry.bankAccountId) {
        if (!bankAccountEntries[entry.bankAccountId]) bankAccountEntries[entry.bankAccountId] = [];
        bankAccountEntries[entry.bankAccountId].push(entry.id);
      } else if (entry.cashAccountId) {
        if (!cashAccountEntries[entry.cashAccountId]) cashAccountEntries[entry.cashAccountId] = [];
        cashAccountEntries[entry.cashAccountId].push(entry.id);
      }
    }

    // Delete duplicate opening entries for bank accounts
    for (const [bankId, ids] of Object.entries(bankAccountEntries)) {
      if (ids.length > 1) {
        const toDelete = ids.slice(1);
        console.log(`Deleting ${toDelete.length} duplicate opening entries for bank account: ${bankId}`);
        await prisma.cashBookEntry.deleteMany({
          where: { id: { in: toDelete } },
        });
      }
    }

    // Delete duplicate opening entries for cash accounts
    for (const [cashId, ids] of Object.entries(cashAccountEntries)) {
      if (ids.length > 1) {
        const toDelete = ids.slice(1);
        console.log(`Deleting ${toDelete.length} duplicate opening entries for cash account: ${cashId}`);
        await prisma.cashBookEntry.deleteMany({
          where: { id: { in: toDelete } },
        });
      }
    }

    // 2. Ensure opening balance entry exists for bank accounts with balance > 0
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { organizationId: orgId, balance: { gt: 0 } },
    });

    for (const bank of bankAccounts) {
      const exists = await prisma.cashBookEntry.findFirst({
        where: { bankAccountId: bank.id, reference: "OPENING" },
      });
      if (!exists) {
        console.log(`Creating opening balance entry for bank account: ${bank.name} ($${bank.balance})`);
        
        // Sum up subsequent transactions to find opening balance
        const debits = await prisma.cashBookEntry.aggregate({
          where: { bankAccountId: bank.id, type: "INFLOW", reference: { not: "OPENING" } },
          _sum: { amount: true },
        });
        const credits = await prisma.cashBookEntry.aggregate({
          where: { bankAccountId: bank.id, type: "OUTFLOW", reference: { not: "OPENING" } },
          _sum: { amount: true },
        });
        const calculatedOpening = bank.balance - (debits._sum.amount ?? 0) + (credits._sum.amount ?? 0);

        if (calculatedOpening > 0) {
          await prisma.cashBookEntry.create({
            data: {
              amount: calculatedOpening,
              date: new Date(bank.createdAt),
              description: `Opening Balance: ${bank.name}`,
              type: "INFLOW",
              debit: calculatedOpening,
              credit: null,
              paymentMethod: "BANK",
              bankAccountId: bank.id,
              reference: "OPENING",
              sourceModule: "CASH_BOOK",
              organizationId: orgId,
            },
          });
        }
      }
    }

    // 3. Recalculate unified running balance chronologically across ALL entries
    const allEntries = await prisma.cashBookEntry.findMany({
      where: { organizationId: orgId },
      orderBy: [
        { date: "asc" },
        { createdAt: "asc" }
      ],
    });

    console.log(`Recalculating unified running balance for ${allEntries.length} entries...`);
    let balance = 0;
    for (const entry of allEntries) {
      const debit = entry.debit ?? 0;
      const credit = entry.credit ?? 0;
      balance += debit - credit;

      await prisma.cashBookEntry.update({
        where: { id: entry.id },
        data: { runningBalance: balance },
      });

      console.log(`  ${entry.date.toISOString().split("T")[0]} | ${entry.description.padEnd(40)} | debit: ${debit} | credit: ${credit} | running: ${balance}`);
    }
  }

  console.log("Cleanup and running balance recalculation complete!");
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
