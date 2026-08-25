import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      opacity: { 12: "0.12", 15: "0.15", 35: "0.35", 45: "0.45", 55: "0.55", 65: "0.65", 85: "0.85" },
      colors: {
        wine: {
          50: "#F1F5F2", 100: "#E5ECE7", 200: "#CAD8CE", 300: "#A6BCAA",
          400: "#78977E", 500: "#55775E", 600: "#365B42", 700: "#294934",
          800: "#213B2B", 900: "#1B3124",
        },
        cream: {
          50: "#FFFFFF", 100: "#F7F7F5", 200: "#EBEBE7", 300: "#DDDDD7", 400: "#C8C7BF",
        },
        ink: {
          400: "#8A8982", 500: "#686760", 700: "#3E3D38", 900: "#20201D",
        },
        gold: { 400: "#A37B45", 500: "#836238" },
      },
      fontFamily: {
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(32,32,29,0.04)",
        sheet: "0 -8px 32px rgba(32,32,29,0.12)",
      },
      keyframes: {
        "sheet-up": { "0%": { transform: "translateY(5%)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
      },
      animation: {
        "sheet-up": "sheet-up 0.18s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "pulse-soft": "pulseSoft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config
