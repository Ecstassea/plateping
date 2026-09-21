import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { notifyWatchers } from "@/lib/notify";
import {
  OFFICIAL_ZRP_LIST_STATEMENT,
  OFFICIAL_ZRP_LIST_URL,
  ROBOT_OFFENCE,
  ZRP_GUIDANCE,
  ZRP_LOCATION,
  displayPlate,
  isPlausiblePlate,
  normalizePlate,
  parsePublishedDate,
} from "@/lib/plates";

const NETLIFY_PLATES = "https://zrp.netlify.app/plateNumbers.js";
const ZRP_LISTS = [OFFICIAL_ZRP_LIST_URL];

const PLATE_TOKEN = /['"]([A-Za-z0-9]{4,10})['"]/g;
const PAGE_PLATE = /\b([A-Z]{3}\s?\d{3,4}|[A-Z0-9]{5,8})\b/g;

function uniquePlates(values: string[]) {
  const seen = new Set<string>();
  const plates: string[] = [];
  for (const value of values) {
    const plate = normalizePlate(value);
    if (!isPlausiblePlate(plate) || seen.has(plate)) {
      continue;
    }
    seen.add(plate);
    plates.push(plate);
  }
  return plates;
}

function extractQuotedPlates(text: string) {
  return uniquePlates([...text.matchAll(PLATE_TOKEN)].map((match) => match[1]));
}

function extractPagePlates(text: string) {
  return uniquePlates([...text.matchAll(PAGE_PLATE)].map((match) => match[1]));
}

// A list page is a few hundred kilobytes at most. Anything past this is not a
// plate list and must not be pulled into memory.
const MAX_BODY_BYTES = 4 * 1024 * 1024;

async function readTextCapped(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) {
    return (await response.text()).slice(0, maxBytes);
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error(`${response.url} is larger than ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "text/plain,text/javascript,text/html,*/*",
      "User-Agent": "PlatePing/1.0 (public traffic-list watcher)",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return readTextCapped(response, MAX_BODY_BYTES);
}

function fallbackPlates() {
  try {
    const file = join(process.cwd(), "data", "fallback-plates.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as string[];
    return uniquePlates(raw);
  } catch {
    return [];
  }
}

async function upsertListedPlates(args: {
  plates: string[];
  source: string;
  sourceUrl: string;
  location: string;
  statementTitle?: string | null;
  publishedAt?: Date | null;
}) {
  let created = 0;
  for (const plate of args.plates) {
    const existing = await prisma.fine.findFirst({
      where: { plateNormalized: plate, source: args.source },
    });

    if (existing) {
      await prisma.fine.update({
        where: { id: existing.id },
        data: {
          offence: ROBOT_OFFENCE,
          location: args.location,
          sourceUrl: args.sourceUrl,
          statementTitle: args.statementTitle || existing.statementTitle,
          listedAt: args.publishedAt ?? existing.listedAt,
          estimatedUsd: null,
        },
      });
      continue;
    }

    await prisma.fine.create({
      data: {
        plateNormalized: plate,
        plateDisplay: displayPlate(plate),
        offence: ROBOT_OFFENCE,
        location: args.location,
        source: args.source,
        sourceUrl: args.sourceUrl,
        statementTitle: args.statementTitle || null,
        listedAt: args.publishedAt ?? new Date(),
        estimatedUsd: null,
        status: "listed",
      },
    });
    created += 1;
    await notifyWatchers(plate, ROBOT_OFFENCE);
  }
  return created;
}

async function runSource(
  source: string,
  work: () => Promise<{
    plates: string[];
    sourceUrl: string;
    location: string;
    statementTitle?: string | null;
    publishedAt?: Date | null;
  }>,
) {
  try {
    const result = await work();
    const newFines = await upsertListedPlates({
      plates: result.plates,
      source,
      sourceUrl: result.sourceUrl,
      location: result.location,
      statementTitle: result.statementTitle,
      publishedAt: result.publishedAt,
    });
    await prisma.syncRun.create({
      data: {
        source,
        status: "ok",
        platesFound: result.plates.length,
        newFines,
      },
    });
    return { source, status: "ok" as const, platesFound: result.plates.length, newFines };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraper error";
    await prisma.syncRun.create({
      data: {
        source,
        status: "error",
        error: message,
      },
    });
    return { source, status: "error" as const, platesFound: 0, newFines: 0, error: message };
  }
}

export async function syncFineLists() {
  const netlify = await runSource("zrp.netlify.app", async () => {
    try {
      const [script, page] = await Promise.all([
        fetchText(NETLIFY_PLATES),
        fetchText("https://zrp.netlify.app/").catch(() => ""),
      ]);
      return {
        plates: extractQuotedPlates(script),
        sourceUrl: OFFICIAL_ZRP_LIST_URL,
        location: ZRP_LOCATION,
        statementTitle: OFFICIAL_ZRP_LIST_STATEMENT.title,
        publishedAt: parsePublishedDate(page) ?? parsePublishedDate(script),
      };
    } catch {
      return {
        plates: fallbackPlates(),
        sourceUrl: OFFICIAL_ZRP_LIST_URL,
        location: ZRP_LOCATION,
        statementTitle: OFFICIAL_ZRP_LIST_STATEMENT.title,
        publishedAt: null,
      };
    }
  });

  const official = await runSource("zrp.gov.zw", async () => {
    const plates: string[] = [];
    let statementTitle: string | null = null;
    let publishedAt: Date | null = null;
    for (const url of ZRP_LISTS) {
      try {
        const html = await fetchText(url);
        plates.push(...extractPagePlates(html));
        const heading = html.match(
          /ZRP PRESS STATEMENT[^<]{10,180}|LIST OF VEHICLES CAPTURED[^<]{10,160}/i,
        );
        if (heading) {
          statementTitle = heading[0].replace(/\s+/g, " ").trim();
          publishedAt = parsePublishedDate(heading[0]) ?? parsePublishedDate(html);
        } else {
          publishedAt = parsePublishedDate(html);
        }
      } catch {
        // Official site is often down; other sources still count.
      }
    }
    return {
      plates: uniquePlates(plates),
      sourceUrl: ZRP_LISTS[0],
      location: ZRP_LOCATION,
      statementTitle: statementTitle || OFFICIAL_ZRP_LIST_STATEMENT.title,
      publishedAt,
    };
  });

  return { sources: [netlify, official] };
}

export async function lookupPlate(rawPlate: string) {
  const plateNormalized = normalizePlate(rawPlate);
  if (!isPlausiblePlate(plateNormalized)) {
    return { ok: false as const, error: "Enter a valid Zimbabwe registration, e.g. ADX 5897." };
  }

  const [fines, listStatus] = await Promise.all([
    prisma.fine.findMany({
      where: { plateNormalized },
      orderBy: [{ listedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.syncRun.findMany({
      where: { status: "ok" },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { source: true, createdAt: true, platesFound: true },
    }),
  ]);

  return {
    ok: true as const,
    plateNormalized,
    plateDisplay: displayPlate(plateNormalized),
    listed: fines.length > 0,
    fines,
    guidance: ZRP_GUIDANCE,
    listStatus,
  };
}
