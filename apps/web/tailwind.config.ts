import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        pretendard: ["var(--font-pretendard)", "sans-serif"],
      },
      colors: {
        poo: {
          50: "#fdf8f3",
          100: "#f5f0eb",
          200: "#e8d8c4",
          300: "#d4a17a",
          400: "#c08050",
          500: "#8b4513",
          600: "#6d360f",
          700: "#4f270b",
          800: "#321807",
          900: "#150a03",
        },
      },
    },
  },
  plugins: [],
};

export default config;
