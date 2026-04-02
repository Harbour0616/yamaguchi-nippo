/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1117",
        surface: "#181c27",
        border: "#2a3045",
        accent: "#4ade9f",
        accent2: "#38bdf8",
        warn: "#fb923c",
        debit: "#818cf8",
        credit: "#34d399",
        text: "#e2e8f0",
        muted: "#64748b",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Noto Sans JP"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
