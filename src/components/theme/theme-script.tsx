import { themeStorageKey } from "@/components/theme/theme-config";

const script = `
(() => {
  const presets = ["lantern", "harbor", "ember", "forest"];
  const modes = ["light", "dark"];
  let preference = {};
  try {
    const raw = window.localStorage.getItem("${themeStorageKey}");
    preference = raw ? JSON.parse(raw) : {};
  } catch {
    preference = {};
  }
  const preset = presets.includes(preference.preset) ? preference.preset : "lantern";
  const mode = modes.includes(preference.mode) ? preference.mode : "light";
  document.documentElement.dataset.themePreset = preset;
  document.documentElement.dataset.themeMode = mode;
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
