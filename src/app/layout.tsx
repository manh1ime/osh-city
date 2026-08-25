import type { Metadata, Viewport } from "next";
import "./globals.css";

// Prisma, bcrypt и серверные сессии должны выполняться в Node.js Runtime.
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Водопад: заказ со столика",
  description: "Электронное меню и система заказов ресторана «Водопад»",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#121714",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
