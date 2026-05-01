import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kb: {
          black: "#0D0D0D",
          "black-2": "#141414",
          "black-3": "#1A1A1A",
          "black-4": "#252525",
          gold: "#C9A84C",
          "gold-light": "#E8D5A3",
          "gold-soft": "#B89540",
          "gold-dark": "#8B6914",
          text: "#F5F5F0",
          "text-muted": "rgba(245, 245, 240, 0.62)",
          "text-faint": "rgba(245, 245, 240, 0.42)",
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["Poppins", "Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      maxWidth: {
        kb: "1240px",
      },
      borderRadius: {
        "kb-sm": "6px",
        kb: "10px",
        "kb-lg": "16px",
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-in",
        slideUp: "slideUp 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
