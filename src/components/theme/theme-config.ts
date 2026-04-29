export type ThemeMode = "light" | "dark";
export type ThemePreset = "lantern" | "harbor" | "ember" | "forest";

export type ThemePreference = {
  preset: ThemePreset;
  mode: ThemeMode;
};

export const themeStorageKey = "guestlantern.theme";

export const themePresets: Array<{ value: ThemePreset; label: string; description: string }> = [
  { value: "lantern", label: "Lantern", description: "GuestLantern teal and gold" },
  { value: "harbor", label: "Harbor", description: "Blue control plane" },
  { value: "ember", label: "Ember", description: "Warm incident console" },
  { value: "forest", label: "Forest", description: "Green operations" }
];

export const defaultThemePreference: ThemePreference = {
  preset: "lantern",
  mode: "light"
};
