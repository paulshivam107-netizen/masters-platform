/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#09090b",
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["Inter", "Geist", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
