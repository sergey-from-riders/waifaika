import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f0ff",
          100: "#d7e6ff",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1A44C0",
          900: "#102A6B",
        },
        ink: "#0F172A",
        paper: "#F8FBFF",
      },
      boxShadow: {
        float: "0 18px 45px rgba(15, 23, 42, 0.12)",
      },
      borderRadius: {
        "4xl": "1.5rem",
      },
      fontFamily: {
        sans: ["Manrope", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 36%), radial-gradient(circle at bottom right, rgba(29, 78, 216, 0.14), transparent 26%), linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
