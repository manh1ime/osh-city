import type { SessionRole } from "./session-token";

/** Основные разделы панели менеджера. */
export const managerSectionRoles = {
  dashboard: ["MANAGER"],
  orders: ["MANAGER"],
  reports: ["MANAGER"],
  menu: ["MANAGER"],
  categories: ["MANAGER"],
  tables: ["MANAGER"],
  staff: ["MANAGER"],
  settings: ["MANAGER"],
} satisfies Record<string, SessionRole[]>;

export type ManagerSection = keyof typeof managerSectionRoles;

export function canAccessManager(role: SessionRole): boolean {
  return role === "MANAGER";
}

export function canAccessSection(
  role: SessionRole,
  section: ManagerSection,
): boolean {
  return (managerSectionRoles[section] as SessionRole[]).includes(role);
}

export function sectionFromPathname(pathname: string): ManagerSection {
  if (pathname.startsWith("/manager/orders")) return "orders";
  if (pathname.startsWith("/manager/reports")) return "reports";
  if (pathname.startsWith("/manager/menu")) return "menu";
  if (pathname.startsWith("/manager/categories")) return "categories";
  if (pathname.startsWith("/manager/tables")) return "tables";
  if (pathname.startsWith("/manager/staff")) return "staff";
  if (pathname.startsWith("/manager/settings")) return "settings";
  return "dashboard";
}

export const roleLabel: Record<SessionRole, string> = {
  WAITER: "Официант",
  MANAGER: "Менеджер",
};
