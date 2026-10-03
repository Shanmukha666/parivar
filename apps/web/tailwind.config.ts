import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-noto-hindi)', 'var(--font-noto-telugu)', 'sans-serif'],
      },
      colors: {
        primary: "#ea580c", // Orange 600 (better contrast than 500)
        secondary: "#0f766e", // Teal 700
        background: "#fffbeb", // Amber 50
        textDark: "#1f2937", // Gray 800
      },
      fontSize: {
        xs: '14px',
        sm: '16px',
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
