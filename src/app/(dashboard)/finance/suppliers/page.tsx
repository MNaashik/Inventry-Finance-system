import { getSuppliers } from "@/app/actions/purchases";
import SuppliersClient from "@/components/finance/suppliers-client";

export const revalidate = 0;

export default async function SuppliersPage() {
  const res = await getSuppliers();

  return (
    <SuppliersClient
      initialSuppliers={res.success ? (res.data as any) : []}
    />
  );
}
