"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

// ==========================================
// Helpers
// ==========================================

async function ensureDefaultCashAccount(orgId: string) {
  const count = await prisma.cashAccount.count({
    where: { organizationId: orgId },
  });
  if (count === 0) {
    await prisma.cashAccount.create({
      data: {
        name: "Main Cash Drawer",
        balance: 0,
        organizationId: orgId,
      },
    });
  }
}

// Recalculates a single unified running balance across ALL cash book entries chronologically
async function recalculateRunningBalances(tx: any, orgId: string) {
  const entries = await tx.cashBookEntry.findMany({
    where: { organizationId: orgId },
    orderBy: [
      { date: "asc" },
      { createdAt: "asc" }
    ],
  });

  let balance = 0;
  for (const entry of entries) {
    const debit = entry.debit ?? 0;
    const credit = entry.credit ?? 0;
    balance += debit - credit;

    await tx.cashBookEntry.update({
      where: { id: entry.id },
      data: { runningBalance: balance },
    });
  }
}

// ==========================================
// 1. Finance Dashboard Metrics Action
// ==========================================

export async function getFinanceDashboardData() {
  try {
    const orgId = await getCurrentOrgId();
    await ensureDefaultCashAccount(orgId);

    // 1. Fetch Opening Balances config
    let opening = await prisma.openingBalance.findUnique({
      where: { organizationId: orgId },
    });
    const opCash = opening?.openingCash ?? 0;
    const opBank = opening?.openingBank ?? 0;
    const opInv = opening?.openingInventoryValue ?? 0;
    const opRec = opening?.openingCustomerReceivables ?? 0;
    const opPay = opening?.openingSupplierPayables ?? 0;

    // 2. Sum of all Cash Accounts balance + Opening Cash
    const cashAccounts = await prisma.cashAccount.findMany({
      where: { organizationId: orgId },
    });
    const cashBalance = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0) + opCash;

    // 3. Sum of all Bank Accounts balance + Opening Bank
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { organizationId: orgId },
    });
    const bankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0) + opBank;

    // 4. Calculate Inventory Value + Opening Inventory
    const variants = await prisma.productVariant.findMany({
      where: { organizationId: orgId },
      include: { product: true },
    });
    const calculatedInvValue = variants.reduce((sum, v) => {
      const cost = v.purchasePrice ?? (v.product.price * 0.6);
      return sum + (v.stock * cost);
    }, 0);
    const inventoryValue = calculatedInvValue + opInv;

    // 5. Calculate Outstanding Customer Receivables + Opening Receivables
    const customers = await prisma.customer.findMany({
      where: { organizationId: orgId },
    });
    const receivables = customers.reduce((sum, c) => sum + c.outstandingBalance, 0) + opRec;

    // 6. Calculate Outstanding Supplier Payables + Opening Payables
    const suppliers = await prisma.supplier.findMany({
      where: { organizationId: orgId },
    });
    const payables = suppliers.reduce((sum, s) => sum + s.outstandingBalance, 0) + opPay;

    // Time Ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // 7. Today's Sales
    const todaySalesRes = await prisma.order.aggregate({
      where: { organizationId: orgId, status: { not: "CANCELLED" }, createdAt: { gte: startOfToday } },
      _sum: { totalAmount: true },
    });
    const todaySales = todaySalesRes._sum.totalAmount ?? 0;

    // 8. Today's Purchases
    const todayPurchasesRes = await prisma.purchase.aggregate({
      where: { organizationId: orgId, status: "COMPLETED", createdAt: { gte: startOfToday } },
      _sum: { totalAmount: true },
    });
    const todayPurchases = todayPurchasesRes._sum.totalAmount ?? 0;

    // 9. Today's Income (Other Income + Sales)
    const todayOtherIncome = await prisma.otherIncome.aggregate({
      where: { organizationId: orgId, date: { gte: startOfToday } },
      _sum: { amount: true },
    });
    const todayIncome = todaySales + (todayOtherIncome._sum.amount ?? 0);

    // 10. Today's Expenses
    const todayExpensesRes = await prisma.expense.aggregate({
      where: { organizationId: orgId, date: { gte: startOfToday } },
      _sum: { amount: true },
    });
    const todayExpenses = todayExpensesRes._sum.amount ?? 0;

    // 11. Today's Cost of Goods Sold (COGS)
    const todayOrderItems = await prisma.orderItem.findMany({
      where: {
        order: { organizationId: orgId, status: { not: "CANCELLED" }, createdAt: { gte: startOfToday } },
      },
      include: { productVariant: true },
    });
    const todayCogs = todayOrderItems.reduce((sum, item) => {
      const cost = item.productVariant?.purchasePrice ?? (item.priceAtOrder * 0.6);
      return sum + (item.quantity * cost);
    }, 0);

    // 12. Today's Net Profit = (Today's Sales - Today's COGS) + Today's Other Income - Today's Expenses
    const todayProfit = (todaySales - todayCogs) + (todayOtherIncome._sum.amount ?? 0) - todayExpenses;

    // 13. Monthly Sales, Other Income, Expenses & COGS
    const monthlySalesRes = await prisma.order.aggregate({
      where: { organizationId: orgId, status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } },
      _sum: { totalAmount: true },
    });
    const monthlySales = monthlySalesRes._sum.totalAmount ?? 0;

    const monthlyOtherIncome = await prisma.otherIncome.aggregate({
      where: { organizationId: orgId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const monthlyIncomeFromOther = monthlyOtherIncome._sum.amount ?? 0;

    const monthlyExpensesRes = await prisma.expense.aggregate({
      where: { organizationId: orgId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const monthlyExpenses = monthlyExpensesRes._sum.amount ?? 0;

    const monthlyOrderItems = await prisma.orderItem.findMany({
      where: {
        order: { organizationId: orgId, status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } },
      },
      include: { productVariant: true },
    });
    const monthlyCogs = monthlyOrderItems.reduce((sum, item) => {
      const cost = item.productVariant?.purchasePrice ?? (item.priceAtOrder * 0.6);
      return sum + (item.quantity * cost);
    }, 0);

    // Monthly Net Profit
    const monthlyProfit = (monthlySales - monthlyCogs) + monthlyIncomeFromOther - monthlyExpenses;

    // 14. Fetch all yearly transactions in parallel to build robust charts
    const [expensesThisYear, otherIncomesThisYear, salesThisYear, purchasesThisYear] = await Promise.all([
      prisma.expense.findMany({
        where: { organizationId: orgId, date: { gte: startOfYear } },
        select: { amount: true, date: true, expenseCategory: { select: { name: true, color: true } } },
      }),
      prisma.otherIncome.findMany({
        where: { organizationId: orgId, date: { gte: startOfYear } },
        select: { amount: true, date: true },
      }),
      prisma.order.findMany({
        where: { organizationId: orgId, status: { not: "CANCELLED" }, createdAt: { gte: startOfYear } },
        select: { totalAmount: true, createdAt: true, items: { include: { productVariant: true } } },
      }),
      prisma.purchase.findMany({
        where: { organizationId: orgId, status: "COMPLETED", createdAt: { gte: startOfYear } },
        select: { totalAmount: true, createdAt: true, paidAmount: true },
      }),
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyDataMap = months.reduce((acc, month, index) => {
      acc[index] = { name: month, sales: 0, purchases: 0, otherIncome: 0, expenses: 0, cogs: 0 };
      return acc;
    }, {} as Record<number, { name: string; sales: number; purchases: number; otherIncome: number; expenses: number; cogs: number }>);

    expensesThisYear.forEach((exp) => {
      const m = new Date(exp.date).getMonth();
      if (monthlyDataMap[m]) monthlyDataMap[m].expenses += exp.amount;
    });

    otherIncomesThisYear.forEach((inc) => {
      const m = new Date(inc.date).getMonth();
      if (monthlyDataMap[m]) monthlyDataMap[m].otherIncome += inc.amount;
    });

    salesThisYear.forEach((sale) => {
      const m = new Date(sale.createdAt).getMonth();
      if (monthlyDataMap[m]) {
        monthlyDataMap[m].sales += sale.totalAmount;
        sale.items.forEach((item) => {
          const cost = item.productVariant?.purchasePrice ?? (item.priceAtOrder * 0.6);
          monthlyDataMap[m].cogs += item.quantity * cost;
        });
      }
    });

    purchasesThisYear.forEach((p) => {
      const m = new Date(p.createdAt).getMonth();
      if (monthlyDataMap[m]) monthlyDataMap[m].purchases += p.totalAmount;
    });

    // 15. Formulate Charts Data
    const chartData = months.map((_, idx) => ({
      name: monthlyDataMap[idx].name,
      income: Math.round((monthlyDataMap[idx].sales + monthlyDataMap[idx].otherIncome) * 100) / 100,
      expense: Math.round(monthlyDataMap[idx].expenses * 100) / 100,
    }));

    const profitTrend = months.map((_, idx) => {
      const grossProfit = monthlyDataMap[idx].sales - monthlyDataMap[idx].cogs;
      const netProfit = grossProfit + monthlyDataMap[idx].otherIncome - monthlyDataMap[idx].expenses;
      return {
        name: monthlyDataMap[idx].name,
        profit: Math.round(netProfit * 100) / 100,
      };
    });

    const salesVsPurchases = months.map((_, idx) => ({
      name: monthlyDataMap[idx].name,
      sales: Math.round(monthlyDataMap[idx].sales * 100) / 100,
      purchases: Math.round(monthlyDataMap[idx].purchases * 100) / 100,
    }));

    // Cash Flow calculations (Cash In vs Cash Out)
    const cashFlowTrend = months.map((_, idx) => {
      const cashIn = monthlyDataMap[idx].sales + monthlyDataMap[idx].otherIncome;
      const cashOut = monthlyDataMap[idx].purchases + monthlyDataMap[idx].expenses;
      return {
        name: monthlyDataMap[idx].name,
        cashIn: Math.round(cashIn * 100) / 100,
        cashOut: Math.round(cashOut * 100) / 100,
        netCashFlow: Math.round((cashIn - cashOut) * 100) / 100,
      };
    });

    // Expense Breakdown by Category
    const categoryMap: Record<string, { value: number; fill: string }> = {};
    expensesThisYear.forEach((exp) => {
      const catName = exp.expenseCategory?.name || "Uncategorized";
      const catColor = exp.expenseCategory?.color || "#64748b";
      if (!categoryMap[catName]) {
        categoryMap[catName] = { value: 0, fill: catColor };
      }
      categoryMap[catName].value += exp.amount;
    });
    const expenseByCategory = Object.entries(categoryMap).map(([name, obj]) => ({
      name,
      value: Math.round(obj.value * 100) / 100,
      fill: obj.fill,
    }));

    // Fetch 5 recent transactions from Cash Book
    const recentTransactions = await prisma.cashBookEntry.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { date: "desc" },
      include: { bankAccount: true, cashAccount: true },
    });

    const formattedRecent = recentTransactions.map((c) => ({
      id: c.id,
      date: c.date,
      description: c.description,
      amount: c.amount,
      type: c.type === "INFLOW" ? "INCOME" as const : "EXPENSE" as const,
      paymentMethod: c.paymentMethod,
      source: c.sourceModule === "EXPENSE" ? "Expense" : c.sourceModule === "INCOME" ? "Other Income" : c.sourceModule === "SALE" ? "Sale" : c.sourceModule === "PURCHASE" ? "Purchase" : "Cash Book",
      reference: c.reference,
      bankName: c.paymentMethod === "BANK" ? c.bankAccount?.name : c.cashAccount?.name,
    }));

    return {
      success: true,
      data: {
        cashBalance,
        bankBalance,
        totalBalance: cashBalance + bankBalance,
        inventoryValue,
        todaySales,
        todayPurchases,
        todayIncome,
        todayExpenses,
        todayProfit,
        monthlyProfit,
        outstandingReceivables: receivables,
        outstandingPayables: payables,
        lowCashWarning: (cashBalance + bankBalance) < 1000,
        recentTransactions: formattedRecent,
        chartData,
        profitTrend,
        salesVsPurchases,
        expenseByCategory,
        cashFlowTrend,
      },
    };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Dashboard metrics error:", error);
    return { success: false, error: error.message || "Failed to load dashboard metrics." };
  }
}

// ==========================================
// 2. Bank Accounts CRUD Actions
// ==========================================

export async function getBankAccounts(search?: string) {
  try {
    const orgId = await getCurrentOrgId();
    const accounts = await prisma.bankAccount.findMany({
      where: {
        organizationId: orgId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { bankName: { contains: search, mode: "insensitive" } },
                { accountNumber: { contains: search, mode: "insensitive" } },
                { accountHolder: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: accounts };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch accounts." };
  }
}

export async function createBankAccount(formData: {
  name: string;
  bankName: string;
  accountNumber: string;
  accountHolder?: string;
  balance?: number;
}) {
  try {
    const orgId = await getCurrentOrgId();
    
    const account = await prisma.$transaction(async (tx) => {
      const acc = await tx.bankAccount.create({
        data: {
          name: formData.name,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountHolder: formData.accountHolder || null,
          balance: formData.balance ?? 0,
          organizationId: orgId,
        },
      });

      if (formData.balance && formData.balance > 0) {
        await tx.cashBookEntry.create({
          data: {
            amount: formData.balance,
            date: new Date(),
            description: `Opening Balance: ${formData.name}`,
            type: "INFLOW",
            debit: formData.balance,
            credit: null,
            paymentMethod: "BANK",
            bankAccountId: acc.id,
            reference: "OPENING",
            sourceModule: "CASH_BOOK",
            organizationId: orgId,
          },
        });

        await recalculateRunningBalances(tx, orgId);
      }

      return acc;
    });

    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance");
    return { success: true, data: account };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to create bank account." };
  }
}

export async function updateBankAccount(
  id: string,
  formData: {
    name: string;
    bankName: string;
    accountNumber: string;
    accountHolder?: string;
    balance?: number;
  }
) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.bankAccount.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Account not found." };

    const account = await prisma.bankAccount.update({
      where: { id },
      data: {
        name: formData.name,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountHolder: formData.accountHolder || null,
        balance: formData.balance ?? existing.balance,
      },
    });
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true, data: account };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to update bank account." };
  }
}

export async function deleteBankAccount(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.bankAccount.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Account not found." };

    await prisma.bankAccount.delete({
      where: { id },
    });
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to delete bank account." };
  }
}

// ==========================================
// 2.5 Cash Accounts CRUD Actions
// ==========================================

export async function getCashAccounts(search?: string) {
  try {
    const orgId = await getCurrentOrgId();
    await ensureDefaultCashAccount(orgId);

    const accounts = await prisma.cashAccount.findMany({
      where: {
        organizationId: orgId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: accounts };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch cash accounts." };
  }
}

export async function createCashAccount(formData: { name: string; balance?: number }) {
  try {
    const orgId = await getCurrentOrgId();
    
    const account = await prisma.$transaction(async (tx) => {
      const acc = await tx.cashAccount.create({
        data: {
          name: formData.name,
          balance: formData.balance ?? 0,
          organizationId: orgId,
        },
      });

      if (formData.balance && formData.balance > 0) {
        await tx.cashBookEntry.create({
          data: {
            amount: formData.balance,
            date: new Date(),
            description: `Opening Balance: ${formData.name}`,
            type: "INFLOW",
            debit: formData.balance,
            credit: null,
            paymentMethod: "CASH",
            cashAccountId: acc.id,
            reference: "OPENING",
            sourceModule: "CASH_BOOK",
            organizationId: orgId,
          },
        });

        await recalculateRunningBalances(tx, orgId);
      }

      return acc;
    });

    revalidatePath("/finance/cash-book");
    revalidatePath("/finance");
    return { success: true, data: account };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to create cash account." };
  }
}

export async function updateCashAccount(id: string, formData: { name: string }) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.cashAccount.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Account not found." };

    const account = await prisma.cashAccount.update({
      where: { id },
      data: { name: formData.name },
    });
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance");
    return { success: true, data: account };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to update cash account." };
  }
}

export async function deleteCashAccount(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.cashAccount.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Account not found." };

    await prisma.cashAccount.delete({
      where: { id },
    });
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to delete cash account." };
  }
}

// ==========================================
// 3. Expense Categories CRUD Actions
// ==========================================

export async function getExpenseCategories(search?: string) {
  try {
    const orgId = await getCurrentOrgId();
    const categories = await prisma.expenseCategory.findMany({
      where: {
        organizationId: orgId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        expenses: {
          select: { amount: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const parsed = categories.map((c) => ({
      ...c,
      totalExpenses: c.expenses.reduce((sum, e) => sum + e.amount, 0),
      count: c.expenses.length,
    }));

    return { success: true, data: parsed };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch categories." };
  }
}

export async function createExpenseCategory(formData: { name: string; description?: string; color?: string; icon?: string; isActive?: boolean }) {
  try {
    const orgId = await getCurrentOrgId();
    
    const duplicate = await prisma.expenseCategory.findFirst({
      where: { name: { equals: formData.name, mode: "insensitive" }, organizationId: orgId },
    });
    if (duplicate) return { success: false, error: "Expense category name already exists." };

    const category = await prisma.expenseCategory.create({
      data: {
        name: formData.name,
        description: formData.description || null,
        color: formData.color || "#6366f1",
        icon: formData.icon || "Tag",
        isActive: formData.isActive ?? true,
        organizationId: orgId,
      },
    });
    revalidatePath("/finance/expense-categories");
    return { success: true, data: category };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to create category." };
  }
}

export async function updateExpenseCategory(
  id: string,
  formData: { name: string; description?: string; color?: string; icon?: string; isActive?: boolean }
) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.expenseCategory.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Category not found." };

    const duplicate = await prisma.expenseCategory.findFirst({
      where: {
        name: { equals: formData.name, mode: "insensitive" },
        organizationId: orgId,
        id: { not: id },
      },
    });
    if (duplicate) return { success: false, error: "Expense category name already exists." };

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        name: formData.name,
        description: formData.description || null,
        color: formData.color ?? existing.color,
        icon: formData.icon ?? existing.icon,
        isActive: formData.isActive ?? existing.isActive,
      },
    });
    revalidatePath("/finance/expense-categories");
    return { success: true, data: category };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to update category." };
  }
}

export async function deleteExpenseCategory(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    const existing = await prisma.expenseCategory.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return { success: false, error: "Category not found." };

    await prisma.expenseCategory.delete({
      where: { id },
    });
    revalidatePath("/finance/expense-categories");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to delete category." };
  }
}

// ==========================================
// 4. Expenses CRUD Actions
// ==========================================

export async function getExpenses(search?: string, categoryId?: string, paymentMethod?: string) {
  try {
    const orgId = await getCurrentOrgId();
    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: orgId,
        ...(categoryId && categoryId !== "ALL" ? { expenseCategoryId: categoryId } : {}),
        ...(paymentMethod && paymentMethod !== "ALL" ? { paymentMethod } : {}),
        ...(search
          ? {
              OR: [
                { expenseNumber: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { supplier: { contains: search, mode: "insensitive" } },
                { reference: { contains: search, mode: "insensitive" } },
                { expenseCategory: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        expenseCategory: true,
        bankAccount: true,
        cashAccount: true,
      },
      orderBy: { date: "desc" },
    });
    return { success: true, data: expenses };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch expenses." };
  }
}

export async function createExpense(formData: {
  amount: number;
  tax?: number;
  date: Date | string;
  description?: string;
  supplier?: string;
  paymentMethod: string;
  bankAccountId?: string;
  cashAccountId?: string;
  expenseCategoryId: string;
  reference?: string;
  attachment?: string;
  notes?: string;
  status?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    await ensureDefaultCashAccount(orgId);

    const expense = await prisma.$transaction(async (tx) => {
      // 1. Generate sequential unique Expense Number
      const count = await tx.expense.count({ where: { organizationId: orgId } });
      let expenseNumber = "";
      let isUnique = false;
      let nextNum = count + 1;
      while (!isUnique) {
        expenseNumber = `EXP-${String(nextNum).padStart(4, "0")}`;
        const existing = await tx.expense.findFirst({
          where: { expenseNumber, organizationId: orgId },
        });
        if (!existing) {
          isUnique = true;
        } else {
          nextNum++;
        }
      }

      // 2. Resolve Category Name for Cash Book Description
      const category = await tx.expenseCategory.findUnique({
        where: { id: formData.expenseCategoryId },
      });

      // 3. Create Expense Record
      const exp = await tx.expense.create({
        data: {
          expenseNumber,
          amount: formData.amount,
          tax: formData.tax ?? 0,
          date: new Date(formData.date),
          description: formData.description || null,
          supplier: formData.supplier || null,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          expenseCategoryId: formData.expenseCategoryId,
          reference: formData.reference || null,
          attachment: formData.attachment || null,
          notes: formData.notes || null,
          status: formData.status || "PAID",
          organizationId: orgId,
        },
      });

      // 4. Adjust account balance (only if status is PAID)
      if (formData.status !== "PENDING") {
        if (formData.paymentMethod === "BANK" && formData.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: formData.bankAccountId },
            data: { balance: { decrement: formData.amount } },
          });
        } else if (formData.paymentMethod === "CASH" && formData.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: formData.cashAccountId },
            data: { balance: { decrement: formData.amount } },
          });
        }
      }

      // 5. Automatically create a Cash Book Entry
      await tx.cashBookEntry.create({
        data: {
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description || `Expense: ${category?.name || "Uncategorized"}`,
          type: "OUTFLOW",
          credit: formData.amount,
          debit: null,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || expenseNumber,
          sourceModule: "EXPENSE",
          expenseId: exp.id,
          organizationId: orgId,
        },
      });

      // 6. Recalculate Cash Book balances
      await recalculateRunningBalances(tx, orgId);

      return exp;
    });

    revalidatePath("/finance/expenses");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true, data: expense };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Create expense error:", error);
    return { success: false, error: error.message || "Failed to create expense." };
  }
}

export async function updateExpense(
  id: string,
  formData: {
    amount: number;
    tax?: number;
    date: Date | string;
    description?: string;
    supplier?: string;
    paymentMethod: string;
    bankAccountId?: string;
    cashAccountId?: string;
    expenseCategoryId: string;
    reference?: string;
    attachment?: string;
    notes?: string;
    status?: string;
  }
) {
  try {
    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new Error("Expense not found.");

      // Reverse previous account balance adjustments
      if (existing.status !== "PENDING") {
        if (existing.paymentMethod === "BANK" && existing.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: existing.bankAccountId },
            data: { balance: { increment: existing.amount } },
          });
        } else if (existing.paymentMethod === "CASH" && existing.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: existing.cashAccountId },
            data: { balance: { increment: existing.amount } },
          });
        }
      }

      // Apply new account balance adjustments (if new status is PAID)
      if (formData.status !== "PENDING") {
        if (formData.paymentMethod === "BANK" && formData.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: formData.bankAccountId },
            data: { balance: { decrement: formData.amount } },
          });
        } else if (formData.paymentMethod === "CASH" && formData.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: formData.cashAccountId },
            data: { balance: { decrement: formData.amount } },
          });
        }
      }

      const category = await tx.expenseCategory.findUnique({
        where: { id: formData.expenseCategoryId },
      });

      // Update Expense
      const updated = await tx.expense.update({
        where: { id },
        data: {
          amount: formData.amount,
          tax: formData.tax ?? 0,
          date: new Date(formData.date),
          description: formData.description || null,
          supplier: formData.supplier || null,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          expenseCategoryId: formData.expenseCategoryId,
          reference: formData.reference || null,
          attachment: formData.attachment || null,
          notes: formData.notes || null,
          status: formData.status || "PAID",
        },
      });

      // Sync the Cash Book Entry
      await tx.cashBookEntry.updateMany({
        where: { expenseId: id },
        data: {
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description || `Expense: ${category?.name || "Uncategorized"}`,
          credit: formData.amount,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || existing.expenseNumber,
        },
      });

      // Recalculate Cash Book running balances
      await recalculateRunningBalances(tx, orgId);

      return updated;
    });

    revalidatePath("/finance/expenses");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Update expense error:", error);
    return { success: false, error: error.message || "Failed to update expense." };
  }
}

export async function deleteExpense(id: string) {
  try {
    const orgId = await getCurrentOrgId();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new Error("Expense not found.");

      // Reverse account balance adjustment
      if (existing.status !== "PENDING") {
        if (existing.paymentMethod === "BANK" && existing.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: existing.bankAccountId },
            data: { balance: { increment: existing.amount } },
          });
        } else if (existing.paymentMethod === "CASH" && existing.cashAccountId) {
          await tx.cashAccount.update({
            where: { id: existing.cashAccountId },
            data: { balance: { increment: existing.amount } },
          });
        }
      }

      // Note: Cascade delete will clean up CashBookEntry automatically
      await tx.expense.delete({
        where: { id },
      });

      // Recalculate balances
      await recalculateRunningBalances(tx, orgId);
    });

    revalidatePath("/finance/expenses");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to delete expense." };
  }
}

// ==========================================
// 5. Other Income CRUD Actions
// ==========================================

export async function getOtherIncomes(search?: string, paymentMethod?: string) {
  try {
    const orgId = await getCurrentOrgId();
    const incomes = await prisma.otherIncome.findMany({
      where: {
        organizationId: orgId,
        ...(paymentMethod && paymentMethod !== "ALL" ? { paymentMethod } : {}),
        ...(search
          ? {
              OR: [
                { incomeNumber: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
                { reference: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        bankAccount: true,
        cashAccount: true,
      },
      orderBy: { date: "desc" },
    });
    return { success: true, data: incomes };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch other incomes." };
  }
}

export async function createOtherIncome(formData: {
  amount: number;
  date: Date | string;
  description?: string;
  category: string;
  paymentMethod: string;
  bankAccountId?: string;
  cashAccountId?: string;
  reference?: string;
  notes?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    await ensureDefaultCashAccount(orgId);

    const income = await prisma.$transaction(async (tx) => {
      // 1. Generate sequential unique Income Number
      const count = await tx.otherIncome.count({ where: { organizationId: orgId } });
      let incomeNumber = "";
      let isUnique = false;
      let nextNum = count + 1;
      while (!isUnique) {
        incomeNumber = `INC-${String(nextNum).padStart(4, "0")}`;
        const existing = await tx.otherIncome.findFirst({
          where: { incomeNumber, organizationId: orgId },
        });
        if (!existing) {
          isUnique = true;
        } else {
          nextNum++;
        }
      }

      // 2. Create Income Record
      const inc = await tx.otherIncome.create({
        data: {
          incomeNumber,
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description || null,
          category: formData.category,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || null,
          notes: formData.notes || null,
          organizationId: orgId,
        },
      });

      // 3. Adjust account balance
      if (formData.paymentMethod === "BANK" && formData.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: formData.bankAccountId },
          data: { balance: { increment: formData.amount } },
        });
      } else if (formData.paymentMethod === "CASH" && formData.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: formData.cashAccountId },
          data: { balance: { increment: formData.amount } },
        });
      }

      // 4. Automatically create Cash Book entry
      await tx.cashBookEntry.create({
        data: {
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description || `Income: ${formData.category}`,
          type: "INFLOW",
          debit: formData.amount,
          credit: null,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || incomeNumber,
          sourceModule: "INCOME",
          otherIncomeId: inc.id,
          organizationId: orgId,
        },
      });

      // 5. Recalculate running balances
      await recalculateRunningBalances(tx, orgId);

      return inc;
    });

    revalidatePath("/finance/other-income");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true, data: income };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Create other income error:", error);
    return { success: false, error: error.message || "Failed to create other income." };
  }
}

export async function updateOtherIncome(
  id: string,
  formData: {
    amount: number;
    date: Date | string;
    description?: string;
    category: string;
    paymentMethod: string;
    bankAccountId?: string;
    cashAccountId?: string;
    reference?: string;
    notes?: string;
  }
) {
  try {
    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.otherIncome.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new Error("Income record not found.");

      // Reverse previous balance adjustments
      if (existing.paymentMethod === "BANK" && existing.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: { balance: { decrement: existing.amount } },
        });
      } else if (existing.paymentMethod === "CASH" && existing.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: existing.cashAccountId },
          data: { balance: { decrement: existing.amount } },
        });
      }

      // Apply new balance adjustments
      if (formData.paymentMethod === "BANK" && formData.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: formData.bankAccountId },
          data: { balance: { increment: formData.amount } },
        });
      } else if (formData.paymentMethod === "CASH" && formData.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: formData.cashAccountId },
          data: { balance: { increment: formData.amount } },
        });
      }

      // Update Income record
      const updated = await tx.otherIncome.update({
        where: { id },
        data: {
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description || null,
          category: formData.category,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || null,
          notes: formData.notes || null,
        },
      });

      // Update Cash Book entry
      await tx.cashBookEntry.updateMany({
        where: { otherIncomeId: id },
        data: {
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description || `Income: ${formData.category}`,
          debit: formData.amount,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || existing.incomeNumber,
        },
      });

      // Recalculate Cash Book balances
      await recalculateRunningBalances(tx, orgId);

      return updated;
    });

    revalidatePath("/finance/other-income");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    console.error("Update other income error:", error);
    return { success: false, error: error.message || "Failed to update other income." };
  }
}

export async function deleteOtherIncome(id: string) {
  try {
    const orgId = await getCurrentOrgId();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.otherIncome.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new Error("Income record not found.");

      // Reverse account balances
      if (existing.paymentMethod === "BANK" && existing.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: { balance: { decrement: existing.amount } },
        });
      } else if (existing.paymentMethod === "CASH" && existing.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: existing.cashAccountId },
          data: { balance: { decrement: existing.amount } },
        });
      }

      // Cascade delete handles cash book entry cleanup
      await tx.otherIncome.delete({
        where: { id },
      });

      await recalculateRunningBalances(tx, orgId);
    });

    revalidatePath("/finance/other-income");
    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to delete other income." };
  }
}

// ==========================================
// 6. Cash Book CRUD Actions
// ==========================================

export async function getCashBookEntries(search?: string, type?: string, paymentMethod?: string) {
  try {
    const orgId = await getCurrentOrgId();
    await ensureDefaultCashAccount(orgId);

    const entries = await prisma.cashBookEntry.findMany({
      where: {
        organizationId: orgId,
        ...(type && type !== "ALL" ? { type } : {}),
        ...(paymentMethod && paymentMethod !== "ALL" ? { paymentMethod } : {}),
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: "insensitive" } },
                { reference: { contains: search, mode: "insensitive" } },
                { sourceModule: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        bankAccount: true,
        cashAccount: true,
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ],
    });
    return { success: true, data: entries };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to fetch cash book entries." };
  }
}

export async function createCashBookEntry(formData: {
  amount: number;
  date: Date | string;
  description: string;
  type: string;
  paymentMethod: string;
  bankAccountId?: string;
  cashAccountId?: string;
  reference?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();

    const entry = await prisma.$transaction(async (tx) => {
      const isInflow = formData.type === "INFLOW";
      
      const ent = await tx.cashBookEntry.create({
        data: {
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description,
          type: formData.type,
          debit: isInflow ? formData.amount : null,
          credit: !isInflow ? formData.amount : null,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || null,
          sourceModule: "CASH_BOOK",
          organizationId: orgId,
        },
      });

      // Adjust account balance
      if (formData.paymentMethod === "BANK" && formData.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: formData.bankAccountId },
          data: {
            balance: isInflow ? { increment: formData.amount } : { decrement: formData.amount },
          },
        });
      } else if (formData.paymentMethod === "CASH" && formData.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: formData.cashAccountId },
          data: {
            balance: isInflow ? { increment: formData.amount } : { decrement: formData.amount },
          },
        });
      }

      await recalculateRunningBalances(tx, orgId);
      return ent;
    });

    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true, data: entry };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to create cash book entry." };
  }
}

export async function updateCashBookEntry(
  id: string,
  formData: {
    amount: number;
    date: Date | string;
    description: string;
    type: string;
    paymentMethod: string;
    bankAccountId?: string;
    cashAccountId?: string;
    reference?: string;
  }
) {
  try {
    const orgId = await getCurrentOrgId();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashBookEntry.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new Error("Cash Book Entry not found.");
      if (existing.sourceModule !== "CASH_BOOK") {
        throw new Error(`This transaction originates from the ${existing.sourceModule} module and must be edited there.`);
      }

      // Reverse previous account balance adjustment
      const wasInflow = existing.type === "INFLOW";
      if (existing.paymentMethod === "BANK" && existing.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: {
            balance: wasInflow ? { decrement: existing.amount } : { increment: existing.amount },
          },
        });
      } else if (existing.paymentMethod === "CASH" && existing.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: existing.cashAccountId },
          data: {
            balance: wasInflow ? { decrement: existing.amount } : { increment: existing.amount },
          },
        });
      }

      // Apply new account balance adjustment
      const isInflow = formData.type === "INFLOW";
      if (formData.paymentMethod === "BANK" && formData.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: formData.bankAccountId },
          data: {
            balance: isInflow ? { increment: formData.amount } : { decrement: formData.amount },
          },
        });
      } else if (formData.paymentMethod === "CASH" && formData.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: formData.cashAccountId },
          data: {
            balance: isInflow ? { increment: formData.amount } : { decrement: formData.amount },
          },
        });
      }

      const updated = await tx.cashBookEntry.update({
        where: { id },
        data: {
          amount: formData.amount,
          date: new Date(formData.date),
          description: formData.description,
          type: formData.type,
          debit: isInflow ? formData.amount : null,
          credit: !isInflow ? formData.amount : null,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.paymentMethod === "BANK" ? formData.bankAccountId : null,
          cashAccountId: formData.paymentMethod === "CASH" ? formData.cashAccountId : null,
          reference: formData.reference || null,
        },
      });

      await recalculateRunningBalances(tx, orgId);
      return updated;
    });

    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true, data: result };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to update cash book entry." };
  }
}

export async function deleteCashBookEntry(id: string) {
  try {
    const orgId = await getCurrentOrgId();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.cashBookEntry.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new Error("Cash Book Entry not found.");
      if (existing.sourceModule !== "CASH_BOOK") {
        throw new Error(`This transaction originates from the ${existing.sourceModule} module and must be deleted there.`);
      }

      // Reverse balance adjustment
      const wasInflow = existing.type === "INFLOW";
      if (existing.paymentMethod === "BANK" && existing.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: {
            balance: wasInflow ? { decrement: existing.amount } : { increment: existing.amount },
          },
        });
      } else if (existing.paymentMethod === "CASH" && existing.cashAccountId) {
        await tx.cashAccount.update({
          where: { id: existing.cashAccountId },
          data: {
            balance: wasInflow ? { decrement: existing.amount } : { increment: existing.amount },
          },
        });
      }

      await tx.cashBookEntry.delete({
        where: { id },
      });

      await recalculateRunningBalances(tx, orgId);
    });

    revalidatePath("/finance/cash-book");
    revalidatePath("/finance/bank-accounts");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    if (isRedirectError(error)) throw error;
    return { success: false, error: error.message || "Failed to delete cash book entry." };
  }
}
