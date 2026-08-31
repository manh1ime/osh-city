import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { writeAudit } from "./audit";
import {
  MANAGER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
  type SessionRole,
} from "./session-token";
import { canAccessManager, type ManagerSection } from "./permissions";
import { normalizeRussianPhone } from "./validation";

export type Session = SessionPayload;
export type SessionArea = "staff" | "manager";

function cookieFor(area: SessionArea) {
  return area === "manager" ? MANAGER_SESSION_COOKIE : STAFF_SESSION_COOKIE;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Проверка логина/пароля и установка сессионного cookie. */
export async function loginWithPassword(
  email: string,
  password: string,
  area: SessionArea,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const user = await prisma.staffUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user || !user.isActive) {
    return { ok: false, error: "Неверный email или пароль" };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Неверный email или пароль" };
  }
  if (area === "manager" && user.role !== "MANAGER") {
    return { ok: false, error: "У этой учетной записи нет доступа в панель менеджера" };
  }
  if (area === "staff" && user.role === "MANAGER") {
    return { ok: false, error: "Менеджер должен входить через панель менеджера" };
  }

  await prisma.staffUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role as SessionRole,
    restaurantId: user.restaurantId,
  };
  const token = await signSession(payload);
  (await cookies()).set(cookieFor(area), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  // A browser must not carry an active session for the other panel.
  const oppositeArea: SessionArea = area === "manager" ? "staff" : "manager";
  (await cookies()).delete(cookieFor(oppositeArea));

  await writeAudit({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "staff.login",
    entityType: "StaffUser",
    entityId: user.id,
    metadata: { role: user.role },
  });

  return { ok: true, session: { ...payload, exp: 0 } };
}

export async function logout(area: SessionArea): Promise<void> {
  const session = await getSession(area);
  if (session) {
    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "staff.logout",
      entityType: "StaffUser",
      entityId: session.userId,
    });
  }
  (await cookies()).delete(cookieFor(area));
}

export async function getSession(area: SessionArea): Promise<Session | null> {
  const token = (await cookies()).get(cookieFor(area))?.value;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { isActive: true, role: true, name: true, restaurantId: true },
  });
  if (!user || !user.isActive || user.restaurantId !== session.restaurantId) return null;
  return { ...session, role: user.role as SessionRole, name: user.name };
}

/** Любая роль: доступ в панель сотрудников. */
export async function requireStaff(): Promise<Session> {
  const session = await getSession("staff");
  if (!session) redirect("/staff/login");
  if (session.role === "MANAGER") redirect("/manager");
  return session;
}

/** Доступ в панель управления: только MANAGER. */
export async function requireManager(
  section: ManagerSection = "dashboard",
): Promise<Session> {
  const session = await getSession("manager");
  if (!session) redirect("/manager/login");
  if (!canAccessManager(session.role)) redirect("/staff/orders");
  void section;
  return session;
}

/** Для server actions: выбрасывает ошибку вместо редиректа. */
export async function requireRole(roles: SessionRole[]): Promise<Session> {
  const area: SessionArea =
    roles.length === 1 && roles[0] === "MANAGER" ? "manager" : "staff";
  const session = await getSession(area);
  if (!session) throw new Error("Не авторизован");
  if (!roles.includes(session.role)) throw new Error("Недостаточно прав");
  return session;
}
