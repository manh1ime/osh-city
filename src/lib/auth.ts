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

export type Session = SessionPayload;
export type SessionArea = "staff" | "manager";

function cookieFor(area: SessionArea) {
  return area === "manager" ? MANAGER_SESSION_COOKIE : STAFF_SESSION_COOKIE;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** РџСЂРѕРІРµСЂРєР° Р»РѕРіРёРЅР°/РїР°СЂРѕР»СЏ + СѓСЃС‚Р°РЅРѕРІРєР° СЃРµСЃСЃРёРѕРЅРЅРѕРіРѕ cookie. */
export async function loginWithPassword(
  email: string,
  password: string,
  area: SessionArea,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const user = await prisma.staffUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user || !user.isActive) {
    return { ok: false, error: "РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ" };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ" };
  }
  if (area === "manager" && user.role !== "MANAGER") {
    return { ok: false, error: "РЈ СЌС‚РѕР№ СѓС‡РµС‚РЅРѕР№ Р·Р°РїРёСЃРё РЅРµС‚ РґРѕСЃС‚СѓРїР° РІ РїР°РЅРµР»СЊ РјРµРЅРµРґР¶РµСЂР°" };
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

  // Cookie СЃРѕР·РґР°РµС‚СЃСЏ РёРјРµРЅРЅРѕ РґР»СЏ РїР°РЅРµР»Рё, РІ РєРѕС‚РѕСЂРѕР№ РІС‹РїРѕР»РЅРµРЅ РІС…РѕРґ.
  // РџРѕСЌС‚РѕРјСѓ РјРµРЅРµРґР¶РµСЂ РјРѕР¶РµС‚ РѕС‚РґРµР»СЊРЅРѕ РІРѕР№С‚Рё Рё РІ СЂР°Р±РѕС‡СѓСЋ РїР°РЅРµР»СЊ РїРµСЂСЃРѕРЅР°Р»Р°.
  (await cookies()).set(cookieFor(area), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

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
  // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ СЃРѕС‚СЂСѓРґРЅРёРє РЅРµ РґРµР°РєС‚РёРІРёСЂРѕРІР°РЅ РїРѕСЃР»Рµ РІС‹РґР°С‡Рё С‚РѕРєРµРЅР°
  const user = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { isActive: true, role: true, name: true },
  });
  if (!user || !user.isActive) return null;
  return { ...session, role: user.role as SessionRole, name: user.name };
}

/** Р›СЋР±Р°СЏ СЂРѕР»СЊ: РґРѕСЃС‚СѓРї РІ РїР°РЅРµР»СЊ РїРµСЂСЃРѕРЅР°Р»Р°. */
export async function requireStaff(): Promise<Session> {
  const session = await getSession("staff");
  if (!session) redirect("/staff/login");
  return session;
}

/** Р”РѕСЃС‚СѓРї РІ РїР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ: С‚РѕР»СЊРєРѕ MANAGER. */
export async function requireManager(
  section: ManagerSection = "dashboard",
): Promise<Session> {
  const session = await getSession("manager");
  if (!session) redirect("/manager/login");
  if (!canAccessManager(session.role)) redirect("/staff/orders");
  // Р’СЃРµ РґРѕСЃС‚СѓРїРЅС‹Рµ СЂР°Р·РґРµР»С‹ РїР°РЅРµР»Рё РїСЂРµРґРЅР°Р·РЅР°С‡РµРЅС‹ С‚РѕР»СЊРєРѕ РґР»СЏ СЂРѕР»Рё MANAGER.
  // РќРµ РїРµСЂРµРЅР°РїСЂР°РІР»СЏРµРј РЅР° /manager РёР· /manager: С‚Р°РєР°СЏ РїСЂРѕРІРµСЂРєР° РјРѕРіР»Р° СЃРѕР·РґР°С‚СЊ С†РёРєР» 307.
  void section;
  return session;
}

/** Р”Р»СЏ server actions: Р±СЂРѕСЃР°РµС‚ РѕС€РёР±РєСѓ РІРјРµСЃС‚Рѕ СЂРµРґРёСЂРµРєС‚Р°. */
export async function requireRole(roles: SessionRole[]): Promise<Session> {
  const area: SessionArea =
    roles.length === 1 && roles[0] === "MANAGER" ? "manager" : "staff";
  const session = await getSession(area);
  if (!session) throw new Error("РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ");
  if (!roles.includes(session.role)) throw new Error("РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїСЂР°РІ");
  return session;
}

