import { TabScreen } from "@/components/TabScreen";
import { isOwner, requireSession } from "@/lib/auth";
import { isPaynowReference } from "@/lib/billing";
import { activeBillingProvider } from "@/lib/billing-provider";
import { prisma } from "@/lib/db";
import { paynowConfig } from "@/lib/paynow";
import { isEntitled, normalizePlan } from "@/lib/plans";
import { BillingClient, type PaymentRow, type PendingPayment } from "./billing-client";

type Props = {
  searchParams: Promise<{ status?: string; paynow?: string; orderReference?: string }>;
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

  const provider = activeBillingProvider();

  // The customer is back from a hosted checkout; the client confirms it.
  let pending: PendingPayment | null = null;
  if (params.paynow && isPaynowReference(params.paynow)) {
    pending = { provider: "paynow", reference: params.paynow };
  } else if (params.orderReference && /^[\w-]{8,120}$/.test(params.orderReference)) {
    pending = { provider: "smilepay", reference: params.orderReference };
  }

  const payments: PaymentRow[] = (
    await prisma.payment.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        orderReference: true,
        provider: true,
        plan: true,
        months: true,
        amountCents: true,
        status: true,
        createdAt: true,
        paidAt: true,
      },
    })
  ).map((payment) => ({
    reference: payment.orderReference,
    provider: payment.provider,
    plan: payment.plan,
    months: payment.months,
    amountUsd: payment.amountCents / 100,
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
    paidAt: payment.paidAt?.toISOString() ?? null,
  }));

  return (
    <TabScreen>
      <BillingClient
        plan={normalizePlan(session.organization.plan)}
        subscriptionStatus={session.organization.subscriptionStatus}
        entitled={isEntitled(session.organization)}
        currentPeriodEnd={session.organization.currentPeriodEnd?.toISOString() ?? null}
        owner={isOwner(session)}
        provider={provider}
        paynowTestMode={paynowConfig()?.testMode ?? false}
        pending={pending}
        payments={payments}
        initialMessage={pending ? "" : checkoutMessage(params.status)}
      />
    </TabScreen>
  );
}
