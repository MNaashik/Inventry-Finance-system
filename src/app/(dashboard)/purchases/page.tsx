import { getPurchases, getSuppliers } from "@/app/actions/purchases";
import { getProducts } from "@/app/actions/products";
import { getBankAccounts, getCashAccounts } from "@/app/actions/finance";
import PurchasesClient from "@/components/finance/purchases-client";

export const revalidate = 0;

export default async function PurchasesPage() {
  const [purchasesRes, suppliersRes, productsRes, bankRes, cashRes] = await Promise.all([
    getPurchases(),
    getSuppliers(),
    getProducts(),
    getBankAccounts(),
    getCashAccounts(),
  ]);

  return (
    <PurchasesClient
      initialPurchases={purchasesRes.success ? (purchasesRes.data as any) : []}
      suppliers={suppliersRes.success ? (suppliersRes.data as any) : []}
      products={productsRes.success ? (productsRes.data as any) : []}
      bankAccounts={bankRes.success ? (bankRes.data as any) : []}
      cashAccounts={cashRes.success ? (cashRes.data as any) : []}
    />
  );
}
