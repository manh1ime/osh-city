import { StaffManager } from "@/components/manager/StaffManager";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ManagerStaffPage() {
  const session = await requireManager("staff");
  const staff = await prisma.staffUser.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <StaffManager
      currentUserId={session.userId}
      staff={staff.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : null,
      }))}
    />
  );
}
