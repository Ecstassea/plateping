import { createHash, timingSafeEqual } from "node:crypto";

// Paynow (Zimbabwe) hosted checkout. Reference: developers.paynow.co.zw.
// Kept free of database code so the hashing can be unit-tested on its own.

export const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

export type PaynowConfig = {
  integrationId: string;
  integrationKey: string;
  /** The Paynow account email. While an integration is in test mode, only this address can pay. */
  merchantEmail: string;
  testMode: boolean;
};

export function paynowConfig(): PaynowConfig | null {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID?.trim();
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY?.trim();
  if (!integrationId || !integrationKey) {
    return null;
  }
  return {
    integrationId,
    integrationKey,
    merchantEmail: process.env.PAYNOW_MERCHANT_EMAIL?.trim() ?? "",
    testMode: process.env.PAYNOW_TEST_MODE === "true",
  };
}

export function paynowConfigured() {
  return paynowConfig() !== null;
}

/** Ordered pairs: Paynow hashes values in the order they appear in the message. */
export type PaynowFields = [string, string][];

/** SHA-512 of the raw values joined together with the integration key on the end, upper-case hex. */
export function paynowHash(values: string[], integrationKey: string) {
  return createHash("sha512")
    .update(values.join("") + integrationKey, "utf8")
    .digest("hex")
    .toUpperCase();
}

export function signPaynowFields(fields: PaynowFields, integrationKey: string): PaynowFields {
  const unsigned = fields.filter(([key]) => key.toLowerCase() !== "hash");
  return [...unsigned, ["hash", paynowHash(unsigned.map(([, value]) => value), integrationKey)]];
}

function decodeComponent(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

/** Paynow replies and calls back as `key=value&key=value` with URL-encoded values. */
export function parsePaynowMessage(body: string): PaynowFields {
  return body
    .trim()
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const split = pair.indexOf("=");
      const key = split === -1 ? pair : pair.slice(0, split);
      const value = split === -1 ? "" : pair.slice(split + 1);
      return [decodeComponent(key), decodeComponent(value)] as [string, string];
    });
}

export function messageValue(fields: PaynowFields, key: string) {
  const wanted = key.toLowerCase();
  return fields.find(([name]) => name.toLowerCase() === wanted)?.[1];
}

/** Recomputes the hash over every value except the hash itself and compares in constant time. */
export function verifyPaynowMessage(fields: PaynowFields, integrationKey: string) {
  const provided = messageValue(fields, "hash");
  if (!provided) {
    return false;
  }
  const values = fields.filter(([key]) => key.toLowerCase() !== "hash").map(([, value]) => value);
  const expected = Buffer.from(paynowHash(values, integrationKey));
  const given = Buffer.from(provided.trim().toUpperCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Statuses Paynow reports. "Awaiting Delivery" and "Delivered" are paid states
// used by merchants who ship goods; for a subscription they all mean paid.
const PAID = new Set(["paid", "awaiting delivery", "delivered"]);
const FAILED = new Set(["cancelled", "failed", "refunded", "disputed"]);

export function isPaynowPaid(status: string) {
  return PAID.has(status.trim().toLowerCase());
}

export function isPaynowFailed(status: string) {
  return FAILED.has(status.trim().toLowerCase());
}

export function isPaynowUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "paynow.co.zw" || url.hostname.endsWith(".paynow.co.zw"));
  } catch {
    return false;
  }
}

export type PaynowInitiation =
  | { ok: true; browserUrl: string; pollUrl: string }
  | { ok: false; error: string };

export async function initiatePaynowPayment(
  config: PaynowConfig,
  args: {
    reference: string;
    amountUsd: number;
    description: string;
    returnUrl: string;
    resultUrl: string;
    authEmail: string;
  },
): Promise<PaynowInitiation> {
  const fields = signPaynowFields(
    [
      ["id", config.integrationId],
      ["reference", args.reference],
      ["amount", args.amountUsd.toFixed(2)],
      ["additionalinfo", args.description],
      ["returnurl", args.returnUrl],
      ["resulturl", args.resultUrl],
      ["authemail", args.authEmail],
      ["status", "Message"],
    ],
    config.integrationKey,
  );

  let text: string;
  let httpStatus: number;
  try {
    const response = await fetch(PAYNOW_INITIATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    httpStatus = response.status;
    text = await response.text();
  } catch {
    return { ok: false, error: "Paynow did not answer. Try again in a moment." };
  }

  if (httpStatus < 200 || httpStatus >= 300) {
    return { ok: false, error: `Paynow returned HTTP ${httpStatus}.` };
  }

  const message = parsePaynowMessage(text);
  const status = (messageValue(message, "status") ?? "").toLowerCase();
  if (status !== "ok") {
    return { ok: false, error: messageValue(message, "error") || "Paynow could not start this payment." };
  }
  if (!verifyPaynowMessage(message, config.integrationKey)) {
    return { ok: false, error: "Paynow's reply failed verification." };
  }

  const browserUrl = messageValue(message, "browserurl");
  const pollUrl = messageValue(message, "pollurl");
  if (!browserUrl || !pollUrl || !isPaynowUrl(browserUrl) || !isPaynowUrl(pollUrl)) {
    return { ok: false, error: "Paynow's reply was incomplete." };
  }

  return { ok: true, browserUrl, pollUrl };
}

export type PaynowStatus = {
  status: string;
  reference: string;
  paynowReference: string;
  amount: number;
};

/** Asks Paynow directly. This, not the posted callback, is what decides whether a plan is granted. */
export async function pollPaynowStatus(config: PaynowConfig, pollUrl: string): Promise<PaynowStatus> {
  if (!isPaynowUrl(pollUrl)) {
    throw new Error("Refusing to poll a URL that is not on paynow.co.zw");
  }

  const response = await fetch(pollUrl, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Paynow poll returned HTTP ${response.status}`);
  }

  const message = parsePaynowMessage(text);
  if (!verifyPaynowMessage(message, config.integrationKey)) {
    throw new Error("Paynow poll reply failed verification");
  }

  return {
    status: messageValue(message, "status") ?? "",
    reference: messageValue(message, "reference") ?? "",
    paynowReference: messageValue(message, "paynowreference") ?? "",
    amount: Number(messageValue(message, "amount") ?? "0"),
  };
}
