import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#f97316", // Orange 500
        secondary: "#14b8a6", // Teal 500
        background: "#fffbeb", // Amber 50
        textDark: "#1f2937", // Gray 800
      },
      fontSize: {
        base: '18px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
      }
    },
  },
  plugins: [],
};
export default config;
