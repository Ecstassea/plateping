import { applyPaidPlan, markPaymentStatus } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { isPaidPlanId } from "@/lib/plans";
import {
  decideWebhookActivation,
  extractClaimedStatusFromCallback,
  extractOrderReferenceFromCallback,
  statusCheck,
  type SmilePayGatewayStatus,
} from "@/lib/smilepay";

export type ProcessWebhookResult = {
  ok: true;
  orderReference: string | null;
  activate: boolean;
  suspicious: boolean;
  reason: string;
  gatewayStatus?: SmilePayGatewayStatus;
};

/**
 * Treat the callback body as a hint only. Always authenticate with statusCheck
 * before activating. Always safe to ACK with HTTP 200 to ZB.
 */
export async function processSmilePayWebhook(
  payload: Record<string, unknown>,
  opts?: {
    /** Injected for tests — when set, skips live gateway call. */
    statusCheckFn?: typeof statusCheck;
    /** When false, never activate from body alone (default true = require check). */
    requireStatusCheck?: boolean;
  },
): Promise<ProcessWebhookResult> {
  const requireStatusCheck = opts?.requireStatusCheck !== false;
  const check = opts?.statusCheckFn ?? statusCheck;
  const orderReference = extractOrderReferenceFromCallback(payload);
  const claimedStatus = extractClaimedStatusFromCallback(payload);

  if (!orderReference) {
    return {
      ok: true,
      orderReference: null,
      activate: false,
      suspicious: false,
      reason: "missing_order_reference",
    };
  }

  const payment = await prisma.payment.findUnique({
    where: { orderReference },
  });

  if (!payment) {
    return {
      ok: true,
      orderReference,
      activate: false,
      suspicious: claimedStatus === "paid",
      reason: "unknown_order_reference",
    };
  }

  if (payment.status === "paid") {
    return {
      ok: true,
      orderReference,
      activate: false,
      suspicious: false,
      reason: "already_paid",
    };
  }

  if (!requireStatusCheck) {
    // Forbidden path — kept only so tests can prove we refuse body-only PAID.
    const decision = decideWebhookActivation({
      claimedStatus,
      gatewayStatus: null,
      alreadyPaid: false,
      statusCheckRan: false,
    });
    return {
      ok: true,
      orderReference,
      activate: decision.activate,
      suspicious: decision.suspicious,
      reason: decision.reason,
    };
  }

  let gateway;
  try {
    gateway = await check(orderReference);
  } catch (error) {
    console.error("Smile&Pay status check failed", {
      orderReference,
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: true,
      orderReference,
      activate: false,
      suspicious: false,
      reason: "status_check_failed",
    };
  }

  const decision = decideWebhookActivation({
    claimedStatus,
    gatewayStatus: gateway.status,
    alreadyPaid: false,
    statusCheckRan: true,
  });

  if (decision.suspicious) {
    console.error("Smile&Pay: forged or stale PAID callback rejected", {
      orderReference,
      claimed: claimedStatus,
      actual: gateway.status,
    });
  }

  if (decision.activate) {
    if (!isPaidPlanId(payment.plan)) {
      return {
        ok: true,
        orderReference,
        activate: false,
        suspicious: true,
        reason: "invalid_plan_on_payment",
        gatewayStatus: gateway.status,
      };
    }
    await applyPaidPlan({
      organizationId: payment.organizationId,
      plan: payment.plan,
      provider: "smilepay",
      orderReference,
      providerTxnRef: gateway.transactionReference,
      rawStatus: gateway.rawStatus ?? "PAID",
    });
  } else if (gateway.status === "failed" || gateway.status === "cancelled" || gateway.status === "expired") {
    await markPaymentStatus({
      orderReference,
      status: gateway.status === "expired" ? "cancelled" : gateway.status,
      rawStatus: gateway.rawStatus,
      providerTxnRef: gateway.transactionReference,
    });
  } else if (gateway.status === "pending" || gateway.status === "processing") {
    await markPaymentStatus({
      orderReference,
      status: "pending",
      rawStatus: gateway.rawStatus,
      providerTxnRef: gateway.transactionReference,
    });
  }

  return {
    ok: true,
    orderReference,
    activate: decision.activate,
    suspicious: decision.suspicious,
    reason: decision.reason,
    gatewayStatus: gateway.status,
  };
}

export function assertWebhookSecretPath(provided: string | undefined): boolean {
  const expected = process.env.SMILEPAY_WEBHOOK_SECRET_PATH?.trim();
  if (!expected) {
    return true;
  }
  return Boolean(provided && provided === expected);
}

export function clientIpAllowed(ip: string | null): boolean {
  const raw = process.env.SMILEPAY_ALLOWED_IPS?.trim();
  if (!raw) {
    return true;
  }
  if (!ip) {
    return false;
  }
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  // Plain IP match only (CIDR omitted for v1 simplicity — document in README).
  return allowed.some((entry) => {
    if (entry.includes("/")) {
      // Basic CIDR: only /8 /16 /24 /32 for IPv4
      const [base, bitsStr] = entry.split("/");
      const bits = Number(bitsStr);
      if (!base || !Number.isFinite(bits) || bits < 0 || bits > 32) {
        return false;
      }
      const ipNum = ipv4ToInt(ip);
      const baseNum = ipv4ToInt(base);
      if (ipNum === null || baseNum === null) {
        return false;
      }
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (ipNum & mask) === (baseNum & mask);
    }
    return entry === ip;
  });
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null;
    }
    n = (n << 8) + octet;
  }
  return n >>> 0;
}
