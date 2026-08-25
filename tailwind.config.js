/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E63946",
          "red-dark": "#C42B38",
          "red-soft": "#FDECEE",
          blue: "#1D4E89",
          "blue-dark": "#163A66",
          "blue-soft": "#E8F1FA",
          "blue-pale": "#F4F8FC",
        },
        ink: {
          900: "#0F172A",
          700: "#334155",
          500: "#64748B",
          400: "#94A3B8",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#F8FAFC",
          pale: "#F4F8FC",
          border: "#E2E8F0",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)",
        card: "0 4px 16px rgba(15,23,42,0.06)",
        lift: "0 12px 32px rgba(15,23,42,0.10)",
        glow: "0 0 0 1px rgba(29,78,137,0.08), 0 8px 24px rgba(29,78,137,0.10)",
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
