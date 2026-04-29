import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--gl-canvas)",
        surface: "var(--gl-surface)",
        "surface-raised": "var(--gl-surface-raised)",
        "surface-muted": "var(--gl-surface-muted)",
        ink: "var(--gl-ink)",
        muted: "var(--gl-muted)",
        subtle: "var(--gl-subtle)",
        line: "var(--gl-line)",
        "line-strong": "var(--gl-line-strong)",
        brand: "var(--gl-brand)",
        "brand-strong": "var(--gl-brand-strong)",
        "brand-soft": "var(--gl-brand-soft)",
        "on-brand": "var(--gl-on-brand)",
        accent: "var(--gl-accent)",
        "accent-soft": "var(--gl-accent-soft)",
        success: "var(--gl-success)",
        "success-soft": "var(--gl-success-soft)",
        "success-line": "var(--gl-success-line)",
        warning: "var(--gl-warning)",
        "warning-soft": "var(--gl-warning-soft)",
        "warning-line": "var(--gl-warning-line)",
        danger: "var(--gl-danger)",
        "danger-soft": "var(--gl-danger-soft)",
        "danger-line": "var(--gl-danger-line)",
        "danger-action": "var(--gl-danger-action)",
        "on-danger": "var(--gl-on-danger)",
        info: "var(--gl-info)",
        "info-soft": "var(--gl-info-soft)",
        "info-line": "var(--gl-info-line)"
      },
      boxShadow: {
        panel: "var(--gl-shadow-panel)",
        control: "var(--gl-shadow-control)",
        nav: "var(--gl-shadow-nav)"
      }
    }
  },
  plugins: []
};

export default config;
