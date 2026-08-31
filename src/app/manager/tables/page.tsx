import { TableManager } from "@/components/manager/TableManager";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ManagerTablesPage() {
  const session = await requireManager("tables");
  const [tables, branches] = await Promise.all([prisma.table.findMany({
    where: { restaurantId: session.restaurantId },
    include: { branch: { select: { id: true, name: true, address: true } } },
    orderBy: [{ branch: { sortOrder: "asc" } }, { number: "asc" }],
  }), prisma.branch.findMany({
    where: { restaurantId: session.restaurantId, isActive: true },
    select: { id: true, name: true, address: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })]);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <TableManager
      baseUrl={baseUrl}
      tables={tables.map((table) => ({
        id: table.id,
        number: table.number,
        zone: table.zone,
        token: table.token,
        isActive: table.isActive,
        branchId: table.branchId,
        branchName: table.branch?.name ?? "Филиал не задан",
        branchAddress: table.branch?.address ?? null,
      }))}
      branches={branches}
    />
  );
}
