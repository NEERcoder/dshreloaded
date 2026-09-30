/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // "red" keys are the legacy token name for the JAVLIN Ignition Orange accent (#FF7A30).
          red: "#FF7A30",
          "red-dark": "#E5671A",
          // Ink variant for orange that carries meaning as text or an icon: #FF7A30
          // only reaches 2.6:1 on white, this clears AA and matches --javlin-orange-ink.
          "red-ink": "#C24A08",
          "red-soft": "#FFF1E8",
          blue: "#1769FF",
          "blue-dark": "#0F53D6",
          "blue-soft": "#E6EEFF",
          "blue-pale": "#F3F7FF",
          navy: "#071A33",
        },
        ink: {
          900: "#071A33",
          800: "#1B2C42",
          700: "#33445C",
          600: "#475569",
          500: "#64748B",
          400: "#94A3B8",
          300: "#CBD5E1",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#F8FAFC",
          pale: "#F4F8FC",
          border: "#E2E8F0",
        },
      },
      fontFamily: {
        // Playfair Display is the JAVLIN brand/display face; the sans stack is UI/body only.
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ['"Playfair Display"', "serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(7,26,51,0.04), 0 1px 2px rgba(7,26,51,0.03)",
        card: "0 4px 16px rgba(7,26,51,0.06)",
        lift: "0 12px 32px rgba(7,26,51,0.10)",
        glow: "0 0 0 1px rgba(23,105,255,0.08), 0 8px 24px rgba(23,105,255,0.10)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "phrase-in": {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "15%": { opacity: "1", transform: "translateY(0)" },
          "85%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
