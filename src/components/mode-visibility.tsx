"use client";

import { useExperienceMode } from "@/components/experience-mode-provider";
import type { ExperienceMode } from "@/lib/experience-mode";

interface ModeVisibilityProps {
  mode: ExperienceMode;
  children: React.ReactNode;
}

export function ModeVisibility({ mode, children }: ModeVisibilityProps) {
  const experience = useExperienceMode();
  return experience.mode === mode ? children : null;
}
