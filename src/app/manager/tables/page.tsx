import { TableManager } from "@/components/manager/TableManager";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ManagerTablesPage() {
  const session = await requireManager("tables");
  const tables = await prisma.table.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { number: "asc" },
  });
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
      }))}
    />
  );
}
