import { getCustomerPayments, getSupplierPayments, getSuppliers } from "@/app/actions/purchases";
import { getCustomers } from "@/app/actions/customers";
import { getBankAccounts, getCashAccounts } from "@/app/actions/finance";
import PaymentsClient from "@/components/finance/payments-client";

export const revalidate = 0;

export default async function PaymentsPage() {
  const [custPayRes, suppPayRes, customersRes, suppliersRes, bankRes, cashRes] = await Promise.all([
    getCustomerPayments(),
    getSupplierPayments(),
    getCustomers(),
    getSuppliers(),
    getBankAccounts(),
    getCashAccounts(),
  ]);

  return (
    <PaymentsClient
      customerPayments={custPayRes.success ? (custPayRes.data as any) : []}
      supplierPayments={suppPayRes.success ? (suppPayRes.data as any) : []}
      customers={customersRes.success ? (customersRes.data as any) : []}
      suppliers={suppliersRes.success ? (suppliersRes.data as any) : []}
      bankAccounts={bankRes.success ? (bankRes.data as any) : []}
      cashAccounts={cashRes.success ? (cashRes.data as any) : []}
    />
  );
}
