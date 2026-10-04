import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { isPlateToken, normalizePlateToken } from "@/lib/plate-list";
import { readJson, rejectUntrustedOrigin } from "@/lib/request";
import { syncFineLists } from "@/lib/scraper";
import { importStatement, readStatementPage } from "@/lib/zrp-lists";

const previewSchema = z.object({
  action: z.literal("preview"),
  url: z.string().trim().url().max(500),
});

const importSchema = z.object({
  action: z.literal("import"),
  url: z.string().trim().url().max(500),
  title: z.string().trim().min(5).max(300),
  publishedOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  plates: z.array(z.string().trim().min(2).max(16)).min(1).max(20000),
});

const syncSchema = z.object({ action: z.literal("sync") });

const dismissSchema = z.object({
  action: z.literal("dismiss"),
  id: z.string().trim().min(8).max(40),
});

const schema = z.discriminatedUnion("action", [previewSchema, importSchema, syncSchema, dismissSchema]);

function forbidden() {
  return NextResponse.json({ error: "Admins only." }, { status: 403 });
}

/**
 * Admin actions on ZRP lists: read a statement page, import a list, run the
 * sync now, or dismiss a statement that turned out not to be a vehicle list.
 */
export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }
  const admin = await requireAdmin();
  if (!admin) {
    return forbidden();
  }

  const parsed = schema.safeParse(await readJson(request, 512 * 1024));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the link, title, date and plates, then try again." }, { status: 400 });
  }
  const body = parsed.data;

  if (body.action === "preview") {
    try {
      const page = await readStatementPage(body.url);
      return NextResponse.json({
        title: page.title,
        publishedOn: page.publishedOn ? page.publishedOn.toISOString().slice(0, 10) : null,
        plates: page.plates,
        unusual: page.unusual,
        duplicates: page.duplicates,
      });
    } catch (error) {
      return NextResponse.json(
        { error: `Could not read that page: ${error instanceof Error ? error.message : "unknown error"}` },
        { status: 502 },
      );
    }
  }

  if (body.action === "import") {
    const plates = [...new Set(body.plates.map(normalizePlateToken).filter(isPlateToken))];
    if (plates.length === 0) {
      return NextResponse.json({ error: "None of those entries look like number plates." }, { status: 400 });
    }
    const host = new URL(body.url).hostname;
    const result = await importStatement({
      source: host === "zrp.gov.zw" || host.endsWith(".zrp.gov.zw") ? "zrp.gov.zw" : "manual",
      url: body.url,
      title: body.title,
      publishedOn: new Date(`${body.publishedOn}T00:00:00Z`),
      plates,
      importedBy: admin.user.email,
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "sync") {
    const result = await syncFineLists();
    return NextResponse.json({ ok: true, ...result });
  }

  await prisma.listStatement.updateMany({
    where: { id: body.id, status: "needs_review" },
    data: { status: "dismissed", note: `Dismissed by ${admin.user.email}: not a vehicle list.` },
  });
  return NextResponse.json({ ok: true });
}
