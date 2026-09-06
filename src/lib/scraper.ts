import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { notifyWatchers } from "@/lib/notify";
import {
  ESTIMATED_FINE,
  ROBOT_OFFENCE,
  displayPlate,
  isPlausiblePlate,
  normalizePlate,
} from "@/lib/plates";

const NETLIFY_PLATES = "https://zrp.netlify.app/plateNumbers.js";
const ZRP_LISTS = [
  "https://zrp.gov.zw/?p=8290",
];

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

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/plain,text/javascript,text/html,*/*",
      "User-Agent": "PlatePing/1.0 (public traffic-list watcher)",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.text();
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
}) {
  let created = 0;
  for (const plate of args.plates) {
    const existing = await prisma.fine.findUnique({
      where: {
        plateNormalized_source_offence: {
          plateNormalized: plate,
          source: args.source,
          offence: ROBOT_OFFENCE,
        },
      },
    });

    if (existing) {
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
        listedAt: new Date(),
        estimatedUsd: ESTIMATED_FINE,
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
  work: () => Promise<{ plates: string[]; sourceUrl: string; location: string }>,
) {
  try {
    const result = await work();
    const newFines = await upsertListedPlates({
      plates: result.plates,
      source,
      sourceUrl: result.sourceUrl,
      location: result.location,
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
      const text = await fetchText(NETLIFY_PLATES);
      return {
        plates: extractQuotedPlates(text),
        sourceUrl: "https://zrp.netlify.app/",
        location: "Harare robot / ETMS lists republished on zrp.netlify.app",
      };
    } catch {
      return {
        plates: fallbackPlates(),
        sourceUrl: "https://zrp.netlify.app/",
        location: "Cached public ZRP robot list",
      };
    }
  });

  const official = await runSource("zrp.gov.zw", async () => {
    const plates: string[] = [];
    for (const url of ZRP_LISTS) {
      try {
        const html = await fetchText(url);
        plates.push(...extractPagePlates(html));
      } catch {
        // Official site is often down; other sources still count.
      }
    }
    return {
      plates: uniquePlates(plates),
      sourceUrl: ZRP_LISTS[0],
      location: "Harare CBD traffic lights — ZRP press list",
    };
  });

  return { sources: [netlify, official] };
}

export async function lookupPlate(rawPlate: string) {
  const plateNormalized = normalizePlate(rawPlate);
  if (!isPlausiblePlate(plateNormalized)) {
    return { ok: false as const, error: "Enter a valid Zimbabwe registration, e.g. ADX 5897." };
  }

  const fines = await prisma.fine.findMany({
    where: { plateNormalized },
    orderBy: { createdAt: "desc" },
  });

  return {
    ok: true as const,
    plateNormalized,
    plateDisplay: displayPlate(plateNormalized),
    listed: fines.length > 0,
    fines,
  };
}
