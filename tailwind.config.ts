import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f7f8fa",
        ink: "#17202a",
        muted: "#64748b",
        line: "#d8dee8",
        brand: "#245b63",
        accent: "#8a5a1f",
        success: "#1f7a4d",
        warning: "#a16207",
        danger: "#b42318"
      },
      boxShadow: {
        panel: "0 1px 2px rgb(15 23 42 / 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
