import { TabScreen } from "@/components/TabScreen";
import { isOwner, requireSession } from "@/lib/auth";
import { normalizePlan } from "@/lib/plans";
import { smilepayConfigured } from "@/lib/smilepay";
import { BillingClient } from "./billing-client";

type Props = {
  searchParams: Promise<{ status?: string; orderReference?: string }>;
};

function checkoutMessage(status: string | undefined) {
  if (status === "success") {
    return "Subscription updated.";
  }
  if (status === "cancelled") {
    return "Checkout was cancelled. Your plan is unchanged.";
  }
  return "";
}

// Seeded on the server, so the plan name is on screen with the tab instead of
// after a second request to /api/me.
export default async function BillingPage({ searchParams }: Props) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  if (!session) {
    return null;
  }

  return (
    <TabScreen>
      <BillingClient
        plan={normalizePlan(session.organization.plan)}
        subscriptionStatus={session.organization.subscriptionStatus}
        owner={isOwner(session)}
        initialMessage={checkoutMessage(params.status)}
        smilepayConfigured={smilepayConfigured()}
        orderReference={params.orderReference}
      />
    </TabScreen>
  );
}
