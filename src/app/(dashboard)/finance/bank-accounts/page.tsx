import { getBankAccounts } from "@/app/actions/finance";
import BankAccountsClient from "@/components/finance/bank-accounts-client";

export const revalidate = 0; // Dynamic data loading

export default async function BankAccountsPage() {
  const res = await getBankAccounts();
  const accounts = res.success && res.data ? res.data : [];

  return <BankAccountsClient initialAccounts={accounts as any} />;
}
