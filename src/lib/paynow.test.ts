import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPaynowPaid,
  isPaynowUrl,
  messageValue,
  parsePaynowMessage,
  signPaynowFields,
  verifyPaynowMessage,
} from "./paynow";

// Both vectors are the worked examples published in Paynow's developer docs
// (Generating Hash and Validating Hash pages).
const KEY = "3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977";

test("outbound hash matches Paynow's published example", () => {
  const signed = signPaynowFields(
    [
      ["id", "1201"],
      ["reference", "TEST REF"],
      ["amount", "99.99"],
      ["additionalinfo", "A test ticket transaction"],
      ["returnurl", "http://www.google.com/search?q=returnurl"],
      ["resulturl", "http://www.google.com/search?q=resulturl"],
      ["status", "Message"],
    ],
    KEY,
  );
  assert.equal(signed.at(-1)?.[0], "hash");
  assert.equal(
    signed.at(-1)?.[1],
    "2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689",
  );
});

test("inbound message verifies against Paynow's published example, and tampering fails", () => {
  const body =
    "status=Ok" +
    "&browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510" +
    "&pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413" +
    "&paynowreference=9510" +
    "&hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D";

  const fields = parsePaynowMessage(body);
  assert.equal(messageValue(fields, "browserurl"), "https://staging.paynow.co.zw/Payment/ConfirmPayment/9510");
  assert.equal(verifyPaynowMessage(fields, KEY), true);

  const tampered: typeof fields = fields.map(([key, value]) => (key === "paynowreference" ? [key, "9511"] : [key, value]));
  assert.equal(verifyPaynowMessage(tampered, KEY), false);
  assert.equal(verifyPaynowMessage(fields, "not-the-key"), false);
  assert.equal(verifyPaynowMessage(fields.filter(([key]) => key !== "hash"), KEY), false);
});

test("form decoding handles plus signs and lower-case escapes", () => {
  const fields = parsePaynowMessage("reference=PP-ABC+123&amount=2.00&status=Awaiting+Delivery");
  assert.equal(messageValue(fields, "reference"), "PP-ABC 123");
  assert.equal(messageValue(fields, "STATUS"), "Awaiting Delivery");
});

test("paid statuses and Paynow URLs are recognised", () => {
  assert.equal(isPaynowPaid("Paid"), true);
  assert.equal(isPaynowPaid("Awaiting Delivery"), true);
  assert.equal(isPaynowPaid("Created"), false);
  assert.equal(isPaynowPaid("Cancelled"), false);
  assert.equal(isPaynowUrl("https://www.paynow.co.zw/Interface/CheckPayment/?guid=x"), true);
  assert.equal(isPaynowUrl("https://evil.example/paynow.co.zw"), false);
  assert.equal(isPaynowUrl("http://www.paynow.co.zw/x"), false);
});
