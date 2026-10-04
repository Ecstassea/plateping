import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AdminLists, type RunRow, type StatementRow } from "./admin-lists";

export const metadata: Metadata = { title: "Admin — PlatePing" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const [statements, runs, listedRows, watched, unverified] = await Promise.all([
    prisma.listStatement.findMany({ orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }] }),
    prisma.syncRun.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(DISTINCT "plateNormalized")::int AS count FROM "Fine" WHERE "status" = 'listed'`,
    prisma.vehicle.count(),
    prisma.fine.count({ where: { status: "unverified" } }),
  ]);

  const statementRows: StatementRow[] = statements.map((s) => ({
    id: s.id,
    url: s.url,
    title: s.title,
    source: s.source,
    status: s.status,
    plateCount: s.plateCount,
    publishedOn: s.publishedOn ? s.publishedOn.toISOString().slice(0, 10) : null,
    importedBy: s.importedBy,
    note: s.note,
  }));
  const runRows: RunRow[] = runs.map((r) => ({
    id: r.id,
    source: r.source,
    status: r.status,
    platesFound: r.platesFound,
    newFines: r.newFines,
    error: r.error,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <AdminLists
      listedPlates={listedRows[0]?.count ?? 0}
      runs={runRows}
      statements={statementRows}
      unverified={unverified}
      watched={watched}
    />
  );
}
