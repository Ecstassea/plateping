export const PAID_PLAN_IDS = ["starter", "family", "fleet", "fleet100", "fleetUnlimited"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];
export type PlanId = "free" | PaidPlanId;
export type PlanKind = "personal" | "company";

export type PlanLimits = {
  vehicles: number | null;
  seats: number | null;
  alerts: boolean;
  kind: PlanKind;
  label: string;
  priceUsd: number;
  blurb: string;
};

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    vehicles: 0,
    seats: 1,
    alerts: false,
    kind: "personal",
    label: "Free check",
    priceUsd: 0,
    blurb: "Look up a plate any time. Watching and alerts need a plan.",
  },
  starter: {
    vehicles: 2,
    seats: 1,
    alerts: true,
    kind: "personal",
    label: "Starter",
    priceUsd: 2,
    blurb: "Two plates, alerts included. $1 a plate.",
  },
  family: {
    vehicles: 6,
    seats: 3,
    alerts: true,
    kind: "personal",
    label: "Family",
    priceUsd: 5,
    blurb: "Six plates and three people on one account.",
  },
  fleet: {
    vehicles: 20,
    seats: 10,
    alerts: true,
    kind: "company",
    label: "Fleet 20",
    priceUsd: 12,
    blurb: "Company starter: up to 20 plates and 10 teammates.",
  },
  fleet100: {
    vehicles: 100,
    seats: 30,
    alerts: true,
    kind: "company",
    label: "Fleet 100",
    priceUsd: 55,
    blurb: "Growing fleets: up to 100 plates and 30 teammates.",
  },
  fleetUnlimited: {
    vehicles: null,
    seats: null,
    alerts: true,
    kind: "company",
    label: "Fleet Unlimited",
    priceUsd: 119,
    blurb: "No plate or teammate cap for large companies.",
  },
};

export const PAID_PLANS: PaidPlanId[] = [...PAID_PLAN_IDS];
export const PERSONAL_PLANS: PaidPlanId[] = ["starter", "family"];
export const COMPANY_PLANS: PaidPlanId[] = ["fleet", "fleet100", "fleetUnlimited"];

export function isPlanId(value: string): value is PlanId {
  return value === "free" || isPaidPlanId(value);
}

export function isPaidPlanId(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as readonly string[]).includes(value);
}

export function normalizePlan(value: string): PlanId {
  if (value === "driver") {
    return "starter";
  }
  return isPlanId(value) ? value : "free";
}

export function isAtCap(used: number, limit: number | null) {
  return limit !== null && used >= limit;
}

export function formatPlateCap(limit: number | null) {
  return limit === null ? "Unlimited plates" : `${limit} plate${limit === 1 ? "" : "s"}`;
}

export function formatSeatCap(limit: number | null) {
  return limit === null ? "Unlimited users" : `${limit} ${limit === 1 ? "user" : "users"}`;
}

export function formatPlanMeta(plan: PlanLimits) {
  return `${formatPlateCap(plan.vehicles)} · ${formatSeatCap(plan.seats)}`;
}

export function formatPlanUsage(used: number, limit: number | null, unit: string) {
  if (limit === null) {
    return `${used} ${unit}`;
  }
  return `${used} / ${limit} ${unit}`;
}

type EntitlementOrg = {
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
};

export function isEntitled(org: EntitlementOrg, now = new Date()): boolean {
  const periodValid = !org.currentPeriodEnd || org.currentPeriodEnd > now;

  if (org.subscriptionStatus === "active") {
    return periodValid;
  }

  if (org.subscriptionStatus === "trialing") {
    return Boolean(org.currentPeriodEnd && org.currentPeriodEnd > now);
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
    case "fleet100":
      return process.env.STRIPE_PRICE_FLEET_100;
    case "fleetUnlimited":
      return process.env.STRIPE_PRICE_FLEET_UNLIMITED;
    default: {
      const _never: never = plan;
      return _never;
    }
  }
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlanId {
  if (priceId && priceId === process.env.STRIPE_PRICE_FLEET_UNLIMITED) {
    return "fleetUnlimited";
  }
  if (priceId && priceId === process.env.STRIPE_PRICE_FLEET_100) {
    return "fleet100";
  }
  if (priceId && priceId === process.env.STRIPE_PRICE_FLEET) {
    return "fleet";
  }
  if (priceId && priceId === process.env.STRIPE_PRICE_FAMILY) {
    return "family";
  }
  return "starter";
}
