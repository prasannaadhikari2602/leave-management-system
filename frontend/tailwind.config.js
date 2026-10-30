/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark blue brand palette
        navy: {
          50: "#eef3fc",
          100: "#d9e4f8",
          200: "#b5c9f0",
          300: "#86a5e4",
          400: "#4f78d1",
          500: "#2d58b8",
          600: "#1f4399",
          700: "#173479",
          800: "#102761",
          900: "#0a1c47",
          950: "#06112e",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(6,17,46,0.06), 0 1px 3px rgba(6,17,46,0.08)",
      },
    },
  },
  plugins: [],
};
