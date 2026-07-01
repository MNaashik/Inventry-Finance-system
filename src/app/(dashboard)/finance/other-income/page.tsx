import { getOtherIncomes, getBankAccounts, getCashAccounts } from "@/app/actions/finance";
import OtherIncomeClient from "@/components/finance/other-income-client";

export const revalidate = 0; // Dynamic loading

export default async function OtherIncomePage() {
  const [incomesRes, accountsRes, cashAccountsRes] = await Promise.all([
    getOtherIncomes(),
    getBankAccounts(),
    getCashAccounts(),
  ]);

  const incomes = incomesRes.success && incomesRes.data ? incomesRes.data : [];
  const bankAccounts = accountsRes.success && accountsRes.data ? accountsRes.data : [];
  const cashAccounts = cashAccountsRes.success && cashAccountsRes.data ? cashAccountsRes.data : [];

  return (
    <OtherIncomeClient
      initialIncomes={incomes as any}
      bankAccounts={bankAccounts as any}
      cashAccounts={cashAccounts as any}
    />
  );
}
