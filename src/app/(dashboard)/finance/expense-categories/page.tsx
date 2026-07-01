import { getExpenseCategories } from "@/app/actions/finance";
import ExpenseCategoriesClient from "@/components/finance/expense-categories-client";

export const revalidate = 0; // Dynamic data loading

export default async function ExpenseCategoriesPage() {
  const res = await getExpenseCategories();
  const categories = res.success && res.data ? res.data : [];

  return <ExpenseCategoriesClient initialCategories={categories as any} />;
}
