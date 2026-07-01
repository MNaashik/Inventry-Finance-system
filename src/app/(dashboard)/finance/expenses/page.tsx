import { getExpenses, getExpenseCategories, getBankAccounts, getCashAccounts } from "@/app/actions/finance";
import ExpensesClient from "@/components/finance/expenses-client";

export const revalidate = 0; // Dynamic loading

export default async function ExpensesPage() {
  const [expensesRes, categoriesRes, accountsRes, cashAccountsRes] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
    getBankAccounts(),
    getCashAccounts(),
  ]);

  const expenses = expensesRes.success && expensesRes.data ? expensesRes.data : [];
  const categories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : [];
  const bankAccounts = accountsRes.success && accountsRes.data ? accountsRes.data : [];
  const cashAccounts = cashAccountsRes.success && cashAccountsRes.data ? cashAccountsRes.data : [];

  return (
    <ExpensesClient
      initialExpenses={expenses as any}
      categories={categories as any}
      bankAccounts={bankAccounts as any}
      cashAccounts={cashAccounts as any}
    />
  );
}
