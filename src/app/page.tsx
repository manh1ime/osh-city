import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Публичного лендинга в системе нет.
 * Корень ведет сотрудника в его рабочее место, гость заходит только по QR-ссылке /menu/[tableToken].
 */
export default async function RootPage() {
  const manager = await getSession("manager");
  if (manager) redirect("/manager");
  const staff = await getSession("staff");
  if (staff) redirect("/staff/orders");
  redirect("/staff/login");
}
