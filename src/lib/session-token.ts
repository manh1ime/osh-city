/**
 * Подписанные сессионные токены (HMAC-SHA256, Web Crypto).
 * Работает и в Node runtime, и в Edge runtime (middleware).
 */

export type SessionRole = "WAITER" | "MANAGER";

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: SessionRole;
  restaurantId: string;
  exp: number; // unix seconds
};

export const STAFF_SESSION_COOKIE = "vodopad_staff_session";
export const MANAGER_SESSION_COOKIE = "vodopad_manager_session";
// Раздельные cookie для сотрудников, менеджеров и гостей ресторана «Водопад».
export const SESSION_COOKIE = "vodopad_session";
export const GUEST_COOKIE = "vodopad_guest";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 часов: смена

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET не задан или слишком короткий");
    }
    return "dev-secret-do-not-use-in-production";
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(full)));
  const key = await importKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const key = await importKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body)),
    ) as SessionPayload;
    if (!payload?.userId || !payload?.role) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
