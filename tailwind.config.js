/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f4f7fb",
        surface: "#ffffff",
        border: "#e2e8ef",
        accent: "#14b8a6",
        accent2: "#0d9488",
        warn: "#f97316",
        debit: "#6366f1",
        credit: "#10b981",
        text: "#1e293b",
        muted: "#94a3b8",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Noto Sans JP"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
