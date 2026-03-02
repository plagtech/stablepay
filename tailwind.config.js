/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#00D67E",
          "primary-dark": "#00B368",
          "primary-light": "#00FFB2",
          accent: "#7C5CFC",
          "accent-light": "#A78BFA",
        },
        surface: {
          0: "#050A12",
          1: "#0B1120",
          2: "#111B2E",
          3: "#182438",
        },
        border: {
          DEFAULT: "#1E2D44",
          light: "#2A3F5F",
        },
        "text-primary": "#E8EDF5",
        "text-muted": "#7A8BA8",
        "text-dim": "#4A5B73",
      },
      fontFamily: {
        display: ["DM Sans", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};
