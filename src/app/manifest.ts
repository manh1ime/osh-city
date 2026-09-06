import type { MetadataRoute } from "next";

/**
 * Web App Manifest.
 *
 * iOS присылает Web Push только сайтам, добавленным на домашний экран,
 * а для этого Safari требует manifest со `display: standalone`.
 * На Android manifest даёт корректную иконку в уведомлениях.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ош-Сити: панель персонала",
    short_name: "Ош-Сити",
    description:
      "Заказы со столиков, вызовы официанта и бронирования кафе «Ош-Сити»",
    start_url: "/staff/orders",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#151817",
    theme_color: "#121714",
    lang: "ru",
    icons: [
      {
        src: "/images/osh-city-emblem.webp",
        sizes: "192x192",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
