import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import { parsePastedList, parseStatementHtml } from "./plate-list";

test("pasted text: lines, commas, numbering and a run of plates on one line", () => {
  const parsed = parsePastedList(`REGISTRATION NUMBERS
1. ADX 5897
2) AFV 7440, AFA8656 ; TOPNASH
ADX 5897
AGA 2185 AGO 4743 59 CD 25
T984SAX`);
  assert.deepEqual(parsed.plates, ["ADX5897", "AFV7440", "AFA8656", "TOPNASH", "AGA2185", "AGO4743", "59CD25", "T984SAX"]);
  assert.equal(parsed.duplicates, 1);
  assert.deepEqual(parsed.unusual, ["TOPNASH", "T984SAX"]);
});

test("statement page: reads the table and never treats a date as a plate", () => {
  const html = `<html><head><title>ZRP PRESS STATEMENT : 17TH MAY 2025 – LIST OF VEHICLES - Zimbabwe Republic Police</title></head>
  <body><p>17TH MAY 2025</p><table><tr><td>ADX 5897</td><td>AFV 7440</td><td>OID 16C</td></tr>
  <tr><td>AGA 2185</td><td>ADX 5897</td><td>TOPNASH</td></tr></table></body></html>`;
  const parsed = parseStatementHtml(html);
  assert.equal(parsed.title, "ZRP PRESS STATEMENT : 17TH MAY 2025 – LIST OF VEHICLES");
  assert.deepEqual(parsed.plates, ["ADX5897", "AFV7440", "OID16C", "AGA2185", "TOPNASH"]);
});

test("the real 17 May 2025 ZRP statement yields its 254 unique plates", { skip: !existsSync("/tmp/may.html") }, () => {
  const parsed = parseStatementHtml(readFileSync("/tmp/may.html", "utf8"));
  assert.equal(parsed.plates.length, 254);
  assert.ok(parsed.plates.includes("ADX5897") && parsed.plates.includes("TOPNASH") && parsed.plates.includes("59CD25"));
});

test("discovery recognises vehicle-list statements and ignores other press releases", async () => {
  const { looksLikeVehicleList } = await import("./zrp-lists");
  assert.equal(looksLikeVehicleList("ZRP PRESS STATEMENT : 17TH MAY 2025 – LIST OF VEHICLES CAPTURED VIOLATING TRAFFIC LIGHTS REGULATIONS IN HARARE"), true);
  assert.equal(looksLikeVehicleList("PRESS STATEMENT : 2 OCTOBER 2025 – REGISTRATION NUMBERS OF MOTORISTS CAPTURED BY THE ETMS"), true);
  assert.equal(looksLikeVehicleList("PRESS STATEMENT : 10TH MARCH 2026 – ZRP LAUNCHES OPERATION ON PLATELESS AND VEHICLES FITTED WITH ILLEGAL SIREN"), false);
  assert.equal(looksLikeVehicleList("ZRP PRESS STATEMENT : 16TH JUNE 2025 – THE ZRP URGES MOTORISTS TO ASSIST IN CURBING CASES OF THEFT OF MOTOR VEHICLES"), false);
});
