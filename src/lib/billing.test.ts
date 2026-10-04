import assert from "node:assert/strict";
import { test } from "node:test";
import { addMonths, carryOverStart } from "./billing";

const now = new Date("2026-10-04T00:00:00Z");
const in30 = new Date("2026-11-03T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

test("same plan: new time is added after the current end", () => {
  const start = carryOverStart({ plan: "starter", subscriptionStatus: "active", currentPeriodEnd: in30 }, "starter", now);
  assert.equal(start.toISOString(), in30.toISOString());
});

test("cheap time bought before an expensive plan is converted by value, not length", () => {
  // 30 days of Starter ($2/mo) is worth about half a day of Fleet Unlimited ($119/mo).
  const start = carryOverStart({ plan: "starter", subscriptionStatus: "active", currentPeriodEnd: in30 }, "fleetUnlimited", now);
  const days = (start.getTime() - now.getTime()) / DAY;
  assert.ok(days > 0.4 && days < 0.6, `expected about 0.5 days, got ${days}`);
});

test("expensive time is not lost when moving to a cheaper plan", () => {
  // 30 days of Fleet 20 ($12) becomes 180 days of Starter ($2).
  const start = carryOverStart({ plan: "fleet", subscriptionStatus: "active", currentPeriodEnd: in30 }, "starter", now);
  const days = Math.round((start.getTime() - now.getTime()) / DAY);
  assert.equal(days, 180);
});

test("trial days carry over as they are, and lapsed time counts for nothing", () => {
  const trial = carryOverStart({ plan: "fleet", subscriptionStatus: "trialing", currentPeriodEnd: in30 }, "starter", now);
  assert.equal(trial.toISOString(), in30.toISOString());
  const lapsed = carryOverStart(
    { plan: "fleet", subscriptionStatus: "active", currentPeriodEnd: new Date("2026-09-01T00:00:00Z") },
    "starter",
    now,
  );
  assert.equal(lapsed.toISOString(), now.toISOString());
});

test("months roll over the end of short months correctly", () => {
  assert.equal(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2026-02-28");
  assert.equal(addMonths(new Date("2026-10-04T00:00:00Z"), 12).toISOString().slice(0, 10), "2027-10-04");
});
