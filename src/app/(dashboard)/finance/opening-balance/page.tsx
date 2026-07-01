import { getOpeningBalances } from "@/app/actions/purchases";
import OpeningBalanceClient from "@/components/finance/opening-balance-client";

export const revalidate = 0;

export default async function OpeningBalancePage() {
  const res = await getOpeningBalances();

  return (
    <OpeningBalanceClient
      initialBalance={res.success ? (res.data as any) : null}
    />
  );
}
