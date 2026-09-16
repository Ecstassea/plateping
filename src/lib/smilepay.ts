/**
 * Thin Smile&Pay (ZB Bank) client — hosted Standard Checkout only.
 * Patterns follow the public Laravel SDK (aaronkatema/laravel-smilepay):
 * sandbox https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway
 * production https://zbnet.zb.co.zw/wallet_gateway/payments-gateway
 *
 * Callbacks are UNSIGNED. Always re-check status with authenticated GET before
 * activating a plan. Never log API secrets.
 */

export type SmilePayEnv = "sandbox" | "production";

export type SmilePayGatewayStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "unknown";

const CURRENCY_NUMERIC: Record<string, string> = {
  USD: "840",
  ZWG: "924",
};

const BASE_URLS: Record<SmilePayEnv, string> = {
  sandbox: "https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway",
  production: "https://zbnet.zb.co.zw/wallet_gateway/payments-gateway",
};

export function smilepayEnv(): SmilePayEnv {
  const raw = (process.env.SMILEPAY_ENV || "").trim().toLowerCase();
  if (raw === "production" || raw === "live") {
    return "production";
  }
  return "sandbox";
}

export function smilepayConfigured(): boolean {
  const env = smilepayEnv();
  const { key, secret } = credentialsFor(env);
  return Boolean(key && secret);
}

function credentialsFor(env: SmilePayEnv) {
  if (env === "production") {
    return {
      key: process.env.SMILEPAY_PRODUCTION_KEY?.trim() || "",
      secret: process.env.SMILEPAY_PRODUCTION_SECRET?.trim() || "",
      baseUrl:
        process.env.SMILEPAY_PRODUCTION_URL?.trim() || BASE_URLS.production,
    };
  }
  return {
    key: process.env.SMILEPAY_SANDBOX_KEY?.trim() || "",
    secret: process.env.SMILEPAY_SANDBOX_SECRET?.trim() || "",
    baseUrl: process.env.SMILEPAY_SANDBOX_URL?.trim() || BASE_URLS.sandbox,
  };
}

export function smilepayCurrency(): string {
  const c = (process.env.SMILEPAY_CURRENCY || "USD").trim().toUpperCase();
  return c === "ZWG" ? "ZWG" : "USD";
}

export function currencyNumericCode(currency: string): string {
  return CURRENCY_NUMERIC[currency.toUpperCase()] || CURRENCY_NUMERIC.USD;
}

export function makeOrderReference(organizationId: string, plan: string): string {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `pp_${organizationId}_${plan}_${token}`;
}

export function mapGatewayStatus(raw: string | null | undefined): SmilePayGatewayStatus {
  if (!raw || !String(raw).trim()) {
    return "unknown";
  }
  const normalised = String(raw).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["pending", "created", "initiated", "new"].includes(normalised)) {
    return "pending";
  }
  if (
    ["processing", "inprogress", "sent", "awaitingpayment", "awaitingconfirmation"].includes(
      normalised,
    )
  ) {
    return "processing";
  }
  if (["paid", "success", "successful", "completed", "complete", "settled"].includes(normalised)) {
    return "paid";
  }
  if (["failed", "failure", "declined", "rejected", "error"].includes(normalised)) {
    return "failed";
  }
  if (["cancelled", "canceled", "aborted", "abandoned"].includes(normalised)) {
    return "cancelled";
  }
  if (["expired", "timeout", "timedout"].includes(normalised)) {
    return "expired";
  }
  return "unknown";
}

function isSuccessResponseCode(code: string | number | null | undefined): boolean {
  if (code === null || code === undefined) {
    return false;
  }
  const normalised = String(code).trim();
  if (!normalised) {
    return false;
  }
  return normalised.length === 1 ? `0${normalised}` === "00" : normalised === "00";
}

function scrubForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubForLog);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (
        key.includes("secret") ||
        key.includes("password") ||
        key.includes("authorization") ||
        key === "x-api-key" ||
        key === "x-api-secret"
      ) {
        out[k] = "[redacted]";
      } else {
        out[k] = scrubForLog(v);
      }
    }
    return out;
  }
  return value;
}

function pluck(body: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return undefined;
}

export type InitiateCheckoutArgs = {
  orderReference: string;
  amountUsd: number;
  itemName: string;
  itemDescription?: string;
  returnUrl: string;
  resultUrl: string;
  email?: string | null;
  firstName?: string | null;
  mobilePhoneNumber?: string | null;
};

export type InitiateCheckoutResult = {
  ok: boolean;
  paymentUrl?: string;
  transactionReference?: string;
  responseCode?: string;
  message?: string;
  raw: Record<string, unknown>;
};

export type StatusCheckResult = {
  status: SmilePayGatewayStatus;
  rawStatus?: string;
  transactionReference?: string;
  responseCode?: string;
  message?: string;
  raw: Record<string, unknown>;
};

async function smilepayFetch(
  method: "GET" | "POST",
  path: string,
  payload?: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const env = smilepayEnv();
  const { key, secret, baseUrl } = credentialsFor(env);
  if (!key || !secret) {
    throw new Error("Smile&Pay is not configured.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const headers: Record<string, string> = {
    "x-api-key": key,
    "x-api-secret": secret,
    Accept: "application/json",
    "User-Agent": "plateping-smilepay/1.0",
  };

  const init: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30_000),
  };

  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(payload);
  }

  const response = await fetch(url, init);
  const text = await response.text();
  let body: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      const parsed = JSON.parse(text) as unknown;
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { value: parsed };
    } catch {
      body = { parseError: true, preview: text.slice(0, 200) };
    }
  }

  if (process.env.SMILEPAY_LOG_REQUESTS === "true") {
    console.info(
      "Smile&Pay",
      JSON.stringify(
        scrubForLog({
          method,
          path,
          httpStatus: response.status,
          request: payload ?? null,
          response: body,
        }),
      ),
    );
  }

  return { status: response.status, body };
}

/** Hosted Standard Checkout — customer pays on ZB's page. */
export async function initiateStandardCheckout(
  args: InitiateCheckoutArgs,
): Promise<InitiateCheckoutResult> {
  const currency = smilepayCurrency();
  const payload: Record<string, unknown> = {
    orderReference: args.orderReference,
    amount: Math.round(args.amountUsd * 100) / 100,
    currencyCode: currencyNumericCode(currency),
    itemName: args.itemName,
    itemDescription: args.itemDescription || args.itemName,
    returnUrl: args.returnUrl,
    resultUrl: args.resultUrl,
  };
  if (args.email) {
    payload.email = args.email;
  }
  if (args.firstName) {
    payload.firstName = args.firstName;
  }
  if (args.mobilePhoneNumber) {
    payload.mobilePhoneNumber = args.mobilePhoneNumber;
  }

  const { status, body } = await smilepayFetch("POST", "payments/initiate-transaction", payload);
  const responseCode = pluck(body, "responseCode", "response_code", "code");
  const accepted = status < 400 && isSuccessResponseCode(responseCode);
  const paymentUrl = pluck(body, "paymentUrl", "payment_url", "redirectUrl", "url");
  const message = pluck(body, "responseMessage", "response_message", "message", "description");

  return {
    ok: accepted && Boolean(paymentUrl),
    paymentUrl,
    transactionReference: pluck(
      body,
      "transactionReference",
      "transaction_reference",
      "reference",
    ),
    responseCode,
    message: message || (accepted ? undefined : "Checkout could not be started."),
    raw: body,
  };
}

/** Authoritative status — never trust an unsigned webhook body alone. */
export async function statusCheck(orderReference: string): Promise<StatusCheckResult> {
  const path = `payments/transaction/${encodeURIComponent(orderReference)}/status/check`;
  const { body } = await smilepayFetch("GET", path);
  const rawStatus = pluck(body, "status", "transactionStatus", "paymentStatus");
  return {
    status: mapGatewayStatus(rawStatus),
    rawStatus,
    transactionReference: pluck(
      body,
      "transactionReference",
      "transaction_reference",
      "reference",
    ),
    responseCode: pluck(body, "responseCode", "response_code", "code"),
    message: pluck(body, "responseMessage", "response_message", "message"),
    raw: body,
  };
}

export function webhookResultUrl(appUrl: string): string {
  const configured = process.env.SMILEPAY_RESULT_URL?.trim();
  if (configured) {
    return configured;
  }
  const secret = process.env.SMILEPAY_WEBHOOK_SECRET_PATH?.trim();
  const base = `${appUrl.replace(/\/$/, "")}/api/billing/smilepay/webhook`;
  return secret ? `${base}/${encodeURIComponent(secret)}` : base;
}

export function webhookReturnUrl(appUrl: string, orderReference: string): string {
  const configured = process.env.SMILEPAY_RETURN_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    url.searchParams.set("orderReference", orderReference);
    if (!url.searchParams.get("status")) {
      url.searchParams.set("status", "success");
    }
    return url.toString();
  }
  const url = new URL("/app/billing", appUrl);
  url.searchParams.set("status", "success");
  url.searchParams.set("orderReference", orderReference);
  return url.toString();
}

export function extractOrderReferenceFromCallback(
  payload: Record<string, unknown>,
): string | null {
  return (
    pluck(payload, "orderReference", "order_reference", "merchantReference") || null
  );
}

export function extractClaimedStatusFromCallback(
  payload: Record<string, unknown>,
): SmilePayGatewayStatus {
  return mapGatewayStatus(pluck(payload, "status", "transactionStatus", "paymentStatus"));
}

/**
 * Pure decision helper for webhook tests.
 * A forged body claiming PAID must not activate unless the authenticated
 * gateway status is also paid.
 */
export function decideWebhookActivation(args: {
  claimedStatus: SmilePayGatewayStatus;
  gatewayStatus: SmilePayGatewayStatus | null;
  alreadyPaid: boolean;
  statusCheckRan: boolean;
}): {
  activate: boolean;
  suspicious: boolean;
  reason: string;
} {
  if (args.alreadyPaid) {
    return { activate: false, suspicious: false, reason: "already_paid" };
  }
  if (!args.statusCheckRan || args.gatewayStatus === null) {
    return {
      activate: false,
      suspicious: args.claimedStatus === "paid",
      reason: "status_check_required",
    };
  }
  if (args.claimedStatus === "paid" && args.gatewayStatus !== "paid") {
    return {
      activate: false,
      suspicious: true,
      reason: `callback_claimed_paid_gateway_${args.gatewayStatus}`,
    };
  }
  if (args.gatewayStatus === "paid") {
    return { activate: true, suspicious: false, reason: "gateway_paid" };
  }
  return {
    activate: false,
    suspicious: false,
    reason: `gateway_${args.gatewayStatus}`,
  };
}
