"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultThemePreference,
  themePresets,
  themeStorageKey,
  type ThemeMode,
  type ThemePreference,
  type ThemePreset
} from "@/components/theme/theme-config";

const presetValues = new Set<ThemePreset>(themePresets.map((preset) => preset.value));
const modeValues = new Set<ThemeMode>(["light", "dark"]);

type ThemeContextValue = {
  preference: ThemePreference;
  setPreset: (preset: ThemePreset) => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizePreference(value: unknown): ThemePreference {
  if (!value || typeof value !== "object") return defaultThemePreference;
  const candidate = value as Partial<ThemePreference>;
  return {
    preset:
      candidate.preset && presetValues.has(candidate.preset)
        ? candidate.preset
        : defaultThemePreference.preset,
    mode:
      candidate.mode && modeValues.has(candidate.mode)
        ? candidate.mode
        : defaultThemePreference.mode
  };
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return defaultThemePreference;
  try {
    const raw = window.localStorage.getItem(themeStorageKey);
    return raw ? normalizePreference(JSON.parse(raw)) : defaultThemePreference;
  } catch {
    return defaultThemePreference;
  }
}

function applyPreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.themePreset = preference.preset;
  document.documentElement.dataset.themeMode = preference.mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(defaultThemePreference);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredPreference();
    setPreference(stored);
    applyPreference(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyPreference(preference);
    try {
      window.localStorage.setItem(themeStorageKey, JSON.stringify(preference));
    } catch {
      // Local storage can be unavailable in locked-down browsers; the active page still updates.
    }
  }, [hydrated, preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreset: (preset) => setPreference((current) => ({ ...current, preset })),
      setMode: (mode) => setPreference((current) => ({ ...current, mode }))
    }),
    [preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
