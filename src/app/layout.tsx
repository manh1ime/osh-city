import type { Metadata, Viewport } from "next";
import "./globals.css";

// Prisma, bcrypt и серверные сессии должны выполняться в Node.js Runtime.
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Учкудук: бронь стола и заказ со столика",
  description: "Кафе «Учкудук»: бронирование стола, электронное меню и заказы в двух филиалах",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  // iOS показывает push только для сайта, добавленного на домашний экран.
  appleWebApp: {
    capable: true,
    title: "Учкудук",
    statusBarStyle: "black-translucent",
  },
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
