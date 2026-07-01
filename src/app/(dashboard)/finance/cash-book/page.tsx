import { getCashBookEntries, getBankAccounts, getCashAccounts } from "@/app/actions/finance";
import CashBookClient from "@/components/finance/cash-book-client";

export const revalidate = 0; // Dynamic loading

export default async function CashBookPage() {
  const [entriesRes, accountsRes, cashAccountsRes] = await Promise.all([
    getCashBookEntries(),
    getBankAccounts(),
    getCashAccounts(),
  ]);

  const entries = entriesRes.success && entriesRes.data ? entriesRes.data : [];
  const bankAccounts = accountsRes.success && accountsRes.data ? accountsRes.data : [];
  const cashAccounts = cashAccountsRes.success && cashAccountsRes.data ? cashAccountsRes.data : [];

  return (
    <CashBookClient
      initialEntries={entries as any}
      bankAccounts={bankAccounts as any}
      cashAccounts={cashAccounts as any}
    />
  );
}
