import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tableMenuUrl } from "@/lib/restaurant";

/** Скачивание QR-кода стола в PNG. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const { tableId } = await params;
  const session = await requireManager("tables");
  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId: session.restaurantId },
  });
  if (!table) {
    return NextResponse.json(
      { ok: false, error: "Стол не найден" },
      { status: 404 },
    );
  }

  const png = await QRCode.toBuffer(tableMenuUrl(table.token), {
    type: "png",
    width: 900,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1C1917", light: "#FFFFFF" },
  });

  // Преобразуем Node.js Buffer в обычный ArrayBuffer для Web Response API.
  const body = new Uint8Array(png.byteLength);
  body.set(png);
  return new NextResponse(body.buffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="table-${table.number}-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}
