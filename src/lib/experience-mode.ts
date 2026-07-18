export type ExperienceMode = "simple" | "pro";

export const EXPERIENCE_MODE_STORAGE_KEY = "rulewallet:experience-mode";

export function parseExperienceMode(value: unknown): ExperienceMode {
  return value === "pro" ? "pro" : "simple";
}

export function nextExperienceMode(mode: ExperienceMode): ExperienceMode {
  return mode === "simple" ? "pro" : "simple";
}
