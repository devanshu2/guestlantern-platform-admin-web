import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeStorageKey } from "@/components/theme/theme-config";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

function renderSwitcher() {
  render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>
  );
}

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme-preset");
    document.documentElement.removeAttribute("data-theme-mode");
  });

  it("exposes preset and mode controls accessibly", async () => {
    renderSwitcher();

    expect(screen.getByLabelText("Theme preset")).toBeVisible();
    expect(screen.getByRole("group", { name: "Color mode" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  });

  it("persists the selected preset and mode", async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.selectOptions(screen.getByLabelText("Theme preset"), "harbor");
    await user.click(screen.getByRole("button", { name: "Dark" }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme-preset", "harbor");
      expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
    });
    expect(window.localStorage.getItem(themeStorageKey)).toBe(
      JSON.stringify({ preset: "harbor", mode: "dark" })
    );
  });
});
