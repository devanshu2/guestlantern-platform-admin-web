"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useId } from "react";
import { themePresets, type ThemeMode, type ThemePreset } from "@/components/theme/theme-config";
import { useTheme } from "@/components/theme/theme-provider";

const modeOptions: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon }
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { preference, setMode, setPreset } = useTheme();
  const presetId = useId();

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "flex-wrap" : "flex-wrap sm:flex-nowrap"}`}
      aria-label="Display theme"
    >
      <label
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-surface-raised px-3 text-sm font-medium text-ink shadow-control"
        htmlFor={presetId}
      >
        <Palette aria-hidden className="h-4 w-4 text-brand" />
        <span className={compact ? "sr-only" : ""}>Theme</span>
        <select
          id={presetId}
          aria-label="Theme preset"
          className="bg-transparent text-sm font-medium text-ink outline-none"
          value={preference.preset}
          onChange={(event) => setPreset(event.target.value as ThemePreset)}
        >
          {themePresets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <div
        className="inline-flex min-h-10 overflow-hidden rounded-md border border-line bg-surface-raised shadow-control"
        role="group"
        aria-label="Color mode"
      >
        {modeOptions.map((option) => {
          const Icon = option.icon;
          const active = preference.mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand text-on-brand"
                  : "text-muted hover:bg-surface-muted hover:text-ink"
              }`}
              onClick={() => setMode(option.value)}
            >
              <Icon aria-hidden className="h-4 w-4" />
              <span className={compact ? "sr-only" : ""}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
