import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Field } from "@/components/ui/field";

describe("Field", () => {
  it("connects label, helper text, and error text accessibly", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      createElement(Field, {
        label: "Restaurant UUID",
        name: "restaurant_id",
        helper: "Example: 33333333-3333-4333-8333-333333333333.",
        error: "Use a valid UUID.",
        value: "",
        onChange
      })
    );

    const input = screen.getByLabelText("Restaurant UUID");
    expect(input).toHaveAccessibleDescription(
      "Example: 33333333-3333-4333-8333-333333333333. Use a valid UUID."
    );
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.type(input, "33333333-3333-4333-8333-333333333333");
    expect(onChange).toHaveBeenCalled();
  });
});
