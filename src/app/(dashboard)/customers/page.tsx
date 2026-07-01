import { getCustomers } from "@/app/actions/customers";
import CustomersClient from "@/components/customers-client";

export const revalidate = 0; // Dynamic loading

export default async function CustomersPage() {
  const result = await getCustomers();
  const customers = result.success && result.data ? result.data : [];

  return <CustomersClient initialCustomers={customers as any} />;
}
