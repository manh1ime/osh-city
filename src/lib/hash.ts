import { createHash, randomBytes, randomUUID } from "node:crypto";

const SALT = process.env.HASH_SALT ?? "dev-hash-salt";

/** Необратимый хеш для IP / User-Agent: персональные данные не хранятся открыто. */
export function hashValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256")
    .update(`${SALT}:${value}`)
    .digest("hex")
    .slice(0, 40);
}

/** Стабильная подпись состава заказа: используется для антидубля. */
export function orderSignature(
  items: Array<{
    menuItemId: string;
    quantity: number;
    comment?: string | null;
  }>,
  comment?: string | null,
): string {
  const normalized = items
    .map(
      (item) =>
        `${item.menuItemId}x${item.quantity}:${(item.comment ?? "").trim()}`,
    )
    .sort()
    .join("|");
  return createHash("sha256")
    .update(`${normalized}#${(comment ?? "").trim()}`)
    .digest("hex")
    .slice(0, 32);
}

/** Длинный неугадываемый токен стола: tbl_5_x7KpQ92aL... */
export function generateTableToken(tableNumber: number, length = 14): string {
  const raw = randomBytes(48)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, Math.max(10, Math.min(length, 40)));
  return `tbl_${tableNumber}_${raw}`;
}

export function newGuestSessionId(): string {
  return `gs_${randomUUID()}`;
}
