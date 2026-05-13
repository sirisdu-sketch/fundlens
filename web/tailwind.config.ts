import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 设计方向:editorial financial,衬线显示 + 现代 sans + 数据等宽
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // 暖色深底,避免冷冰冰的纯黑
        ink: {
          950: "#0a0908",
          900: "#13110f",
          800: "#1c1a17",
          700: "#2a2724",
          600: "#3a3631",
          500: "#5a554f",
          400: "#807a72",
          300: "#a8a39b",
          200: "#d0ccc4",
          100: "#ebe7df",
        },
        // 暖琥珀(强调色,稀有金属感)
        amber: {
          DEFAULT: "#d4a574",
          dim:     "#a37f55",
          bright:  "#e6b888",
        },
        // 涨跌色 — 克制的饱和度,不刺眼
        up:   "#5eaa7a",
        down: "#d97a6b",
      },
    },
  },
  plugins: [],
};

export default config;
