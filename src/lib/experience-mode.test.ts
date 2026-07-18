import { describe, expect, it } from "vitest";
import { nextExperienceMode, parseExperienceMode } from "./experience-mode";

describe("experience mode", () => {
  it("defaults malformed or missing values to the beginner-safe simple mode", () => {
    expect(parseExperienceMode(undefined)).toBe("simple");
    expect(parseExperienceMode("advanced")).toBe("simple");
    expect(parseExperienceMode("simple")).toBe("simple");
  });

  it("restores and toggles pro mode explicitly", () => {
    expect(parseExperienceMode("pro")).toBe("pro");
    expect(nextExperienceMode("simple")).toBe("pro");
    expect(nextExperienceMode("pro")).toBe("simple");
  });
});
