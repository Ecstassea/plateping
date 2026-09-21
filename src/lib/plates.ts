export function normalizePlate(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function displayPlate(normalized: string): string {
  const match = normalized.match(/^([A-Z]{3})(\d{3,4})$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return normalized;
}

export function isPlausiblePlate(normalized: string): boolean {
  return /^[A-Z0-9]{4,10}$/.test(normalized);
}

export const ROBOT_OFFENCE = "Red traffic-light violation (ETMS cameras)";
export const ZRP_LOCATION = "Harare Central Business District";

export const OFFICIAL_ZRP_LIST_STATEMENT = {
  href: "https://zrp.gov.zw/?p=8290",
  title:
    "ZRP press statement, 17 May 2025 — list of vehicles captured violating traffic lights in Harare CBD",
  shortLabel: "Read the 17 May 2025 ZRP list statement",
} as const;

export const OFFICIAL_ZRP_SCAM_STATEMENT = {
  href: "https://zrp.gov.zw/?p=8303",
  title: "ZRP press statement, 14 June 2025 — fake messages asking people to pay traffic fines online",
  shortLabel: "Do not pay traffic fines online",
} as const;

export const OFFICIAL_ZRP_LIST_URL = OFFICIAL_ZRP_LIST_STATEMENT.href;

export function sourceLabel(source: string) {
  switch (source) {
    case "zrp.gov.zw":
      return "Official ZRP press statement";
    case "zrp.netlify.app":
      return "Public plate list (not a ZRP website)";
    default:
      return "Published traffic list";
  }
}

export function sourceHref(source: string, sourceUrl: string | null) {
  switch (source) {
    case "zrp.gov.zw":
    case "zrp.netlify.app":
      return OFFICIAL_ZRP_LIST_STATEMENT.href;
    default:
      return sourceUrl;
  }
}

export function statementDisplayTitle(source: string, storedTitle: string | null) {
  switch (source) {
    case "zrp.gov.zw":
    case "zrp.netlify.app":
      return OFFICIAL_ZRP_LIST_STATEMENT.title;
    default:
      return storedTitle || "Published traffic list";
  }
}

export const ZRP_REPORT =
  "Report to ZRP National Traffic at Mkushi Academy (formerly Morris Depot), or call 0242 703631 / WhatsApp 0712 800 197. PlatePing cannot take a fine payment. Pay only at a police station.";

export const ZRP_GUIDANCE = {
  meaning:
    "ZRP published this registration on an Electronic Traffic Management System list for running a red robot in Harare’s CBD. That is an appeal to report in, not a digital ticket.",
  action:
    "The vehicle owner or whoever has the car should report to ZRP National Traffic at Mkushi Academy (formerly Morris Depot) within the time given on the press statement, or contact the National Complaints Desk.",
  station: "ZRP National Traffic, Mkushi Academy (formerly Morris Depot), Harare",
  phone: "0242 703631",
  phoneHref: "tel:+263242703631",
  whatsapp: "0712 800 197",
  whatsappHref: "https://wa.me/263712800197",
  payWarning:
    "PlatePing is purely a notification service and does not offer any way to pay the fine. ZRP has warned that messages asking you to pay a traffic fine online are scams. Pay only at an official police station.",
  unpublished: [
    "ticket or docket number",
    "the exact fine or deposit",
    "the exact camera or intersection",
    "the registered owner’s name",
  ],
} as const;

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export function parsePublishedDate(text: string): Date | null {
  const official = text.match(
    /(\d{1,2})(?:ST|ND|RD|TH)?\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})/i,
  );
  if (official) {
    const month = MONTHS[official[2].toLowerCase()];
    if (month !== undefined) {
      return new Date(Date.UTC(Number(official[3]), month, Number(official[1])));
    }
  }

  const written = text.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})/i,
  );
  if (written) {
    const month = MONTHS[written[1].toLowerCase()];
    if (month !== undefined) {
      return new Date(Date.UTC(Number(written[3]), month, Number(written[2])));
    }
  }

  return null;
}

export function formatListDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Harare",
  });
}
