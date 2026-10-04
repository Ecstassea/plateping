/**
 * Reads number plates out of a ZRP list, whether it arrives as a web page
 * table or as text pasted by a person. Pure functions with no database, so the
 * admin screen can preview a list in the browser before importing it.
 */

/** Modern (ABC 1234), older (ABC 123) and diplomatic (59 CD 25) plates. */
const STANDARD = [/^[A-Z]{3}\d{4}$/, /^[A-Z]{3}\d{3}$/, /^\d{1,3}CD\d{1,3}$/];

const NOT_PLATES = new Set([
  "REGISTRATION", "REGISTRATIONS", "NUMBER", "NUMBERS", "VEHICLE", "VEHICLES", "PLATE", "PLATES",
  "ZRP", "POLICE", "HARARE", "LIST", "NO", "SN", "SERIAL", "REG", "REGNO", "TOTAL", "PAGE",
]);

export function normalizePlateToken(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function isStandardPlate(plate: string) {
  return STANDARD.some((pattern) => pattern.test(plate));
}

/**
 * Whether a single list entry can be a plate. Personalised plates such as
 * TOPNASH and foreign ones such as T984SAX are real and must be kept, so the
 * rule is deliberately loose; non-standard entries are flagged for review.
 */
export function isPlateToken(plate: string) {
  if (plate.length < 3 || plate.length > 10 || NOT_PLATES.has(plate)) {
    return false;
  }
  if (/^\d+$/.test(plate) && plate.length <= 4) {
    return false; // row numbers
  }
  return true;
}

export type ParsedList = {
  /** Unique plates, in the order they first appear. */
  plates: string[];
  /** Plates that are not in a standard Zimbabwe format, worth a second look. */
  unusual: string[];
  /** How many entries repeated a plate already seen. */
  duplicates: number;
};

function collect(tokens: string[]): ParsedList {
  const seen = new Set<string>();
  const plates: string[] = [];
  let duplicates = 0;
  for (const raw of tokens) {
    const plate = normalizePlateToken(raw.replace(/^\s*\d{1,4}[.)]\s+/, ""));
    if (!isPlateToken(plate)) {
      continue;
    }
    if (seen.has(plate)) {
      duplicates += 1;
      continue;
    }
    seen.add(plate);
    plates.push(plate);
  }
  return { plates, unusual: plates.filter((plate) => !isStandardPlate(plate)), duplicates };
}

/**
 * Text pasted from a statement, a PDF, or copied out of a photo with the
 * phone's Live Text or Google Lens. Entries may be separated by new lines,
 * commas, semicolons, tabs, bars or runs of spaces; "ADX 5897" stays together.
 */
export function parsePastedList(text: string): ParsedList {
  const chunks = text
    .split(/\r?\n|[,;|\t]|\s{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  // A line holding several plates separated by single spaces ("ADX 5897 AFV 7440")
  // is split into its standard plates rather than read as one long entry.
  const tokens: string[] = [];
  for (const chunk of chunks) {
    const compact = normalizePlateToken(chunk);
    if (compact.length <= 10) {
      tokens.push(chunk);
      continue;
    }
    const found = chunk.toUpperCase().match(/\b[A-Z]{3}\s?\d{3,4}\b|\b\d{1,3}\s?CD\s?\d{1,3}\b/g);
    if (found) {
      tokens.push(...found);
    }
  }
  return collect(tokens);
}

/** The table cells of a ZRP statement page. Falls back to its text if it has no table. */
export function parseStatementHtml(html: string): ParsedList & { title: string | null } {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch
    ? decodeEntities(titleMatch[1]).replace(/\s*[-–|]\s*Zimbabwe Republic Police\s*$/i, "").trim()
    : null;

  const cells = [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) =>
    decodeEntities(match[1].replace(/<[^>]+>/g, " ")).trim(),
  );
  if (cells.length >= 5) {
    return { title, ...collect(cells) };
  }

  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = decodeEntities(body.replace(/<[^>]+>/g, "\n"));
  const found = text.toUpperCase().match(/\b[A-Z]{3}\s?\d{4}\b|\b\d{1,3}\s?CD\s?\d{1,3}\b/g) ?? [];
  // "MAY 2025" looks like a plate; dates are not.
  const months = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/;
  return { title, ...collect(found.filter((token) => !months.test(token))) };
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ");
}

export function displayListPlate(plate: string) {
  const modern = plate.match(/^([A-Z]{3})(\d{3,4})$/);
  return modern ? `${modern[1]} ${modern[2]}` : plate;
}
