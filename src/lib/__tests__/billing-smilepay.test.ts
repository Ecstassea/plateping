import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  decideWebhookActivation,
  mapGatewayStatus,
  smilepayConfigured,
} from "../smilepay";

describe("smilepayConfigured", () => {
  const prev = { ...process.env };

  after(() => {
    process.env = { ...prev };
  });

  it("is false without keys", () => {
    delete process.env.SMILEPAY_SANDBOX_KEY;
    delete process.env.SMILEPAY_SANDBOX_SECRET;
    delete process.env.SMILEPAY_PRODUCTION_KEY;
    delete process.env.SMILEPAY_PRODUCTION_SECRET;
    process.env.SMILEPAY_ENV = "sandbox";
    assert.equal(smilepayConfigured(), false);
  });

  it("is true when sandbox key+secret set", () => {
    process.env.SMILEPAY_ENV = "sandbox";
    process.env.SMILEPAY_SANDBOX_KEY = "test-key";
    process.env.SMILEPAY_SANDBOX_SECRET = "test-secret";
    assert.equal(smilepayConfigured(), true);
  });
});

describe("mapGatewayStatus", () => {
  it("maps paid synonyms and never invents paid from junk", () => {
    assert.equal(mapGatewayStatus("PAID"), "paid");
    assert.equal(mapGatewayStatus("Successful"), "paid");
    assert.equal(mapGatewayStatus("PENDING"), "pending");
    assert.equal(mapGatewayStatus("weird-new-status"), "unknown");
  });
});

describe("decideWebhookActivation — forged PAID without status check", () => {
  it("refuses to activate when status check did not run", () => {
    const decision = decideWebhookActivation({
      claimedStatus: "paid",
      gatewayStatus: null,
      alreadyPaid: false,
      statusCheckRan: false,
    });
    assert.equal(decision.activate, false);
    assert.equal(decision.suspicious, true);
    assert.equal(decision.reason, "status_check_required");
  });

  it("refuses forged PAID when gateway says pending", () => {
    const decision = decideWebhookActivation({
      claimedStatus: "paid",
      gatewayStatus: "pending",
      alreadyPaid: false,
      statusCheckRan: true,
    });
    assert.equal(decision.activate, false);
    assert.equal(decision.suspicious, true);
  });

  it("activates only when gateway confirms paid", () => {
    const decision = decideWebhookActivation({
      claimedStatus: "paid",
      gatewayStatus: "paid",
      alreadyPaid: false,
      statusCheckRan: true,
    });
    assert.equal(decision.activate, true);
    assert.equal(decision.suspicious, false);
  });

  it("is idempotent when already paid", () => {
    const decision = decideWebhookActivation({
      claimedStatus: "paid",
      gatewayStatus: "paid",
      alreadyPaid: true,
      statusCheckRan: true,
    });
    assert.equal(decision.activate, false);
    assert.equal(decision.reason, "already_paid");
  });
});

describe("applyPaidPlan idempotency (DB)", async () => {
  // Load .env.local without printing secrets
  const fs = await import("node:fs");
  const path = await import("node:path");
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (process.env[m[1]] !== undefined) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }

  const hasDb = Boolean(process.env.DATABASE_URL?.startsWith("postgres"));
  if (!hasDb) {
    it("skips — no postgres DATABASE_URL", () => {
      assert.ok(true);
    });
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const { applyPaidPlan } = await import("../billing");
  const prisma = new PrismaClient();

  let organizationId = "";
  let orderReference = "";

  before(async () => {
    const org = await prisma.organization.create({
      data: {
        name: "SmilePay Test Org",
        type: "personal",
        inviteCode: `T${Date.now().toString(36).slice(-7)}`.toUpperCase(),
        plan: "free",
        subscriptionStatus: "inactive",
      },
    });
    organizationId = org.id;
    orderReference = `pp_${organizationId}_starter_testidempotency01`;
    await prisma.payment.create({
      data: {
        organizationId,
        orderReference,
        plan: "starter",
        amountCents: 200,
        currency: "USD",
        status: "pending",
        provider: "smilepay",
      },
    });
  });

  after(async () => {
    if (organizationId) {
      await prisma.payment.deleteMany({ where: { organizationId } });
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("activates once and ignores replay", async () => {
    const first = await applyPaidPlan({
      organizationId,
      plan: "starter",
      provider: "smilepay",
      orderReference,
      rawStatus: "PAID",
    });
    assert.equal(first.applied, true);
    assert.equal(first.alreadyApplied, false);

    const org1 = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    assert.equal(org1.plan, "starter");
    assert.equal(org1.subscriptionStatus, "active");
    assert.ok(org1.currentPeriodEnd);
    const end1 = org1.currentPeriodEnd!.getTime();

    const second = await applyPaidPlan({
      organizationId,
      plan: "starter",
      provider: "smilepay",
      orderReference,
      rawStatus: "PAID",
    });
    assert.equal(second.applied, false);
    assert.equal(second.alreadyApplied, true);

    const org2 = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    assert.equal(org2.currentPeriodEnd!.getTime(), end1);
  });
});

describe("processSmilePayWebhook forged PAID", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (process.env[m[1]] !== undefined) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }

  const hasDb = Boolean(process.env.DATABASE_URL?.startsWith("postgres"));
  if (!hasDb) {
    it("skips — no postgres DATABASE_URL", () => {
      assert.ok(true);
    });
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const { processSmilePayWebhook } = await import("../smilepay-webhook");
  const prisma = new PrismaClient();

  let organizationId = "";
  let orderReference = "";

  before(async () => {
    const org = await prisma.organization.create({
      data: {
        name: "SmilePay Forge Org",
        type: "personal",
        inviteCode: `F${Date.now().toString(36).slice(-7)}`.toUpperCase(),
        plan: "free",
        subscriptionStatus: "inactive",
      },
    });
    organizationId = org.id;
    orderReference = `pp_${organizationId}_family_testforge000001`;
    await prisma.payment.create({
      data: {
        organizationId,
        orderReference,
        plan: "family",
        amountCents: 500,
        currency: "USD",
        status: "pending",
        provider: "smilepay",
      },
    });
  });

  after(async () => {
    if (organizationId) {
      await prisma.payment.deleteMany({ where: { organizationId } });
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("does not unlock when callback claims PAID but status check says pending", async () => {
    const result = await processSmilePayWebhook(
      { orderReference, status: "PAID", amount: 5 },
      {
        statusCheckFn: async () => ({
          status: "pending",
          rawStatus: "PENDING",
          raw: { status: "PENDING" },
        }),
      },
    );
    assert.equal(result.activate, false);
    assert.equal(result.suspicious, true);

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    assert.equal(org.plan, "free");
    assert.notEqual(org.subscriptionStatus, "active");

    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderReference } });
    assert.notEqual(payment.status, "paid");
  });
});
