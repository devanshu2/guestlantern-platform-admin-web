import { describe, expect, it } from "vitest";
import { isActiveJobStatus, statusLabel, stepProgress } from "@/lib/api/status";

describe("status helpers", () => {
  it("identifies active provisioning jobs", () => {
    expect(isActiveJobStatus("queued")).toBe(true);
    expect(isActiveJobStatus("running")).toBe(true);
    expect(isActiveJobStatus("failed")).toBe(false);
  });

  it("formats known and unknown statuses", () => {
    expect(statusLabel("not_ready")).toBe("Not ready");
    expect(statusLabel("custom_backend_state")).toBe("Custom Backend State");
  });

  it("bounds step progress", () => {
    expect(stepProgress(2, 4)).toBe(50);
    expect(stepProgress(0, 0)).toBe(0);
  });
});
