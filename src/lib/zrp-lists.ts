import https from "node:https";
import tls from "node:tls";
import { notifyAdmins } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { notifyWatchers } from "@/lib/notify";
import { displayListPlate, parseStatementHtml } from "@/lib/plate-list";
import { ROBOT_OFFENCE, ZRP_LOCATION, parsePublishedDate } from "@/lib/plates";
import { DIGICERT_G2_TLS_RSA_SHA256_2020_CA1 } from "@/lib/zrp-cert";

/** ZRP's "Press Statements" category. New lists appear on its first pages. */
const ZRP_PRESS_PAGES = ["https://zrp.gov.zw/?cat=188", "https://zrp.gov.zw/?cat=188&paged=2"];

/** A statement title that announces a list of vehicles caught on camera. */
export function looksLikeVehicleList(title: string) {
  return (
    /(captured|violat|traffic light|e\.?t\.?m\.?s|electronic traffic|registration numbers)/i.test(title) &&
    /(vehicle|motorist|registration)/i.test(title)
  );
}

/** Fewer plates than this from a statement page means its list is an image or a file. */
const MIN_PLATES_FOR_AUTO_IMPORT = 10;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const TRUSTED = [...tls.rootCertificates, DIGICERT_G2_TLS_RSA_SHA256_2020_CA1];

/**
 * Fetches a page over HTTPS with full certificate checking, trusting the
 * system roots plus the intermediate ZRP's server forgets to send. Follows a
 * few redirects and stops at a sensible size.
 */
export function fetchPage(url: string, redirects = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        ca: TRUSTED,
        headers: {
          Accept: "text/html,*/*",
          "User-Agent": "Mozilla/5.0 (compatible; PlatePing/1.0; +public traffic-list watcher)",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400 && response.headers.location && redirects > 0) {
          response.resume();
          resolve(fetchPage(new URL(response.headers.location, url).toString(), redirects - 1));
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`${url} answered HTTP ${status}`));
          return;
        }
        const chunks: Buffer[] = [];
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > MAX_BODY_BYTES) {
            request.destroy(new Error(`${url} is larger than expected`));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        response.on("error", reject);
      },
    );
    request.setTimeout(25000, () => request.destroy(new Error(`${url} did not answer within 25 seconds`)));
    request.on("error", (error: NodeJS.ErrnoException) =>
      reject(new Error(`${url}: ${error.code ? `${error.code} ` : ""}${error.message}`)),
    );
  });
}

export type StatementInput = {
  source: "zrp.gov.zw" | "manual";
  url: string;
  title: string;
  publishedOn: Date | null;
  plates: string[];
  importedBy?: string | null;
};

export type ImportResult = {
  statementId: string;
  total: number;
  added: number;
  alertedPlates: number;
};

/**
 * Records a ZRP list and its plates, then alerts everyone watching a plate on
 * it. Importing the same statement again only adds plates it did not have.
 */
export async function importStatement(input: StatementInput): Promise<ImportResult> {
  const plates = [...new Set(input.plates)];
  const statement = await prisma.listStatement.upsert({
    where: { url: input.url },
    create: {
      source: input.source,
      url: input.url,
      title: input.title,
      publishedOn: input.publishedOn,
      status: "imported",
      importedBy: input.importedBy ?? null,
    },
    update: {
      title: input.title,
      publishedOn: input.publishedOn,
      status: "imported",
      importedBy: input.importedBy ?? undefined,
    },
  });

  const existing = await prisma.fine.findMany({
    where: { statementId: statement.id },
    select: { plateNormalized: true },
  });
  const have = new Set(existing.map((row) => row.plateNormalized));
  const fresh = plates.filter((plate) => !have.has(plate));

  if (fresh.length > 0) {
    await prisma.fine.createMany({
      data: fresh.map((plate) => ({
        plateNormalized: plate,
        plateDisplay: displayListPlate(plate),
        offence: ROBOT_OFFENCE,
        location: ZRP_LOCATION,
        source: input.source,
        sourceUrl: input.url,
        statementTitle: input.title,
        listedAt: input.publishedOn ?? new Date(),
        status: "listed",
        statementId: statement.id,
      })),
      skipDuplicates: true,
    });
  }

  const total = await prisma.fine.count({ where: { statementId: statement.id } });
  await prisma.listStatement.update({ where: { id: statement.id }, data: { plateCount: total } });

  // Only plates somebody watches need an alert.
  const watched = fresh.length
    ? await prisma.vehicle.findMany({
        where: { plateNormalized: { in: fresh } },
        select: { plateNormalized: true },
        distinct: ["plateNormalized"],
      })
    : [];
  for (const { plateNormalized } of watched) {
    await notifyWatchers(plateNormalized, {
      title: input.title,
      url: input.url,
      publishedOn: input.publishedOn,
    }).catch(() => undefined);
  }

  return { statementId: statement.id, total, added: fresh.length, alertedPlates: watched.length };
}

/** Reads one ZRP statement page into a list ready to import. */
export async function readStatementPage(url: string) {
  const html = await fetchPage(url);
  const parsed = parseStatementHtml(html);
  const title = parsed.title ?? "ZRP press statement";
  return { ...parsed, title, publishedOn: parsePublishedDate(title) ?? parsePublishedDate(html) };
}

/** Finds vehicle-list statements on ZRP's press pages. */
export async function discoverStatements() {
  const found = new Map<string, string>();
  for (const page of ZRP_PRESS_PAGES) {
    const html = await fetchPage(page);
    for (const match of html.matchAll(/<a[^>]+href="(https?:\/\/zrp\.gov\.zw\/\?p=\d+)"[^>]*>([^<]{15,})<\/a>/g)) {
      const url = match[1].replace(/^http:/, "https:");
      const title = match[2].replace(/&#8211;/g, "–").replace(/&#8217;/g, "’").replace(/&amp;/g, "&").trim();
      if (looksLikeVehicleList(title) && !found.has(url)) {
        found.set(url, title);
      }
    }
  }
  return [...found.entries()].map(([url, title]) => ({ url, title }));
}

export type OfficialSyncResult = {
  source: "zrp.gov.zw";
  status: "ok" | "error";
  statementsSeen: number;
  imported: number;
  newFines: number;
  platesFound: number;
  needsReview: number;
  error?: string;
};

/**
 * Checks ZRP's website for vehicle lists. A list published as a table is
 * imported and alerted straight away. One published only as an image or file
 * is recorded as needing review, and the admins are told to import it by hand.
 */
export async function syncOfficialStatements(): Promise<OfficialSyncResult> {
  const result: OfficialSyncResult = {
    source: "zrp.gov.zw",
    status: "ok",
    statementsSeen: 0,
    imported: 0,
    newFines: 0,
    platesFound: 0,
    needsReview: 0,
  };
  const errors: string[] = [];

  let candidates: { url: string; title: string }[] = [];
  try {
    candidates = await discoverStatements();
  } catch (error) {
    return { ...result, status: "error", error: error instanceof Error ? error.message : "Could not read ZRP's site" };
  }
  result.statementsSeen = candidates.length;

  for (const candidate of candidates) {
    const known = await prisma.listStatement.findUnique({ where: { url: candidate.url } });
    if (known && known.status !== "needs_review") {
      result.platesFound += known.plateCount;
      continue;
    }
    try {
      const page = await readStatementPage(candidate.url);
      if (page.plates.length >= MIN_PLATES_FOR_AUTO_IMPORT) {
        const imported = await importStatement({
          source: "zrp.gov.zw",
          url: candidate.url,
          title: page.title,
          publishedOn: page.publishedOn,
          plates: page.plates,
        });
        result.imported += 1;
        result.newFines += imported.added;
        result.platesFound += imported.total;
      } else if (!known) {
        await prisma.listStatement.create({
          data: {
            source: "zrp.gov.zw",
            url: candidate.url,
            title: page.title,
            publishedOn: page.publishedOn,
            status: "needs_review",
            note: "Found on ZRP's website, but its plates are not in readable text.",
          },
        });
        result.needsReview += 1;
        await notifyAdmins(
          `New ZRP list needs importing: ${page.title.slice(0, 80)}`,
          `ZRP published "${page.title}" at ${candidate.url}, but its plates are in an image or file PlatePing cannot read. Open Admin in PlatePing and import it from text so watchers are alerted.`,
        );
      }
    } catch (error) {
      errors.push(`${candidate.url}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  // Report the size of everything customers are checked against, not just this run.
  const listed = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(DISTINCT "plateNormalized")::int AS count FROM "Fine" WHERE "status" = 'listed'`;
  result.platesFound = listed[0]?.count ?? result.platesFound;

  if (errors.length) {
    result.status = "error";
    result.error = errors.join(" | ").slice(0, 500);
  }
  return result;
}
