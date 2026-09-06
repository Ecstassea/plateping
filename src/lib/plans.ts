export type PlanId = "free" | "starter" | "family" | "fleet";
export type PaidPlanId = Exclude<PlanId, "free">;

export type PlanLimits = {
  vehicles: number;
  seats: number;
  alerts: boolean;
  label: string;
  priceUsd: number;
  blurb: string;
};

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    vehicles: 0,
    seats: 1,
    alerts: false,
    label: "Free check",
    priceUsd: 0,
    blurb: "Look up a plate any time. Watching and alerts need a plan.",
  },
  starter: {
    vehicles: 2,
    seats: 1,
    alerts: true,
    label: "Starter",
    priceUsd: 2,
    blurb: "Two plates, alerts included. $1 a plate.",
  },
  family: {
    vehicles: 6,
    seats: 3,
    alerts: true,
    label: "Family",
    priceUsd: 5,
    blurb: "Six plates and three people on one account.",
  },
  fleet: {
    vehicles: 20,
    seats: 10,
    alerts: true,
    label: "Fleet",
    priceUsd: 12,
    blurb: "Twenty plates and ten teammates for companies.",
  },
};

export const PAID_PLANS: PaidPlanId[] = ["starter", "family", "fleet"];

export function isPlanId(value: string): value is PlanId {
  return value === "free" || value === "starter" || value === "family" || value === "fleet";
}

export function isPaidPlanId(value: string): value is PaidPlanId {
  return value === "starter" || value === "family" || value === "fleet";
}

export function normalizePlan(value: string): PlanId {
  if (value === "driver") {
    return "starter";
  }
  return isPlanId(value) ? value : "free";
}

type EntitlementOrg = {
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
};

export function isEntitled(org: EntitlementOrg, now = new Date()): boolean {
  if (org.subscriptionStatus === "active") {
    return true;
  }
  if (org.subscriptionStatus === "trialing" && org.currentPeriodEnd && org.currentPeriodEnd > now) {
    return true;
  }
  return false;
}

export function getLimits(org: EntitlementOrg): PlanLimits {
  if (!isEntitled(org)) {
    return PLANS.free;
  }
  return PLANS[normalizePlan(org.plan)];
}

export function stripePriceEnv(plan: PaidPlanId): string | undefined {
  switch (plan) {
    case "starter":
      return process.env.STRIPE_PRICE_STARTER;
    case "family":
      return process.env.STRIPE_PRICE_FAMILY;
    case "fleet":
      return process.env.STRIPE_PRICE_FLEET;
    default: {
      const _never: never = plan;
      return _never;
    }
  }
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlanId {
  if (priceId && priceId === process.env.STRIPE_PRICE_FLEET) {
    return "fleet";
  }
  if (priceId && priceId === process.env.STRIPE_PRICE_FAMILY) {
    return "family";
  }
  return "starter";
}
