"use client";

import { SlidersHorizontal, Sparkles } from "lucide-react";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ExperienceModeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ExperienceModeToggle({ compact = false, className }: ExperienceModeToggleProps) {
  const { mode, setMode } = useExperienceMode();
  const pro = mode === "pro";

  return (
    <label className={cn("flex cursor-pointer items-center gap-2 rounded-lg border border-grid bg-card/70 px-2.5 py-1.5", className)}>
      {pro ? <SlidersHorizontal className="size-3.5 text-primary" /> : <Sparkles className="size-3.5 text-primary" />}
      {!compact && <span className="text-xs font-medium">{pro ? "Pro mode" : "Simple mode"}</span>}
      <Switch
        size="sm"
        checked={pro}
        onCheckedChange={(checked) => setMode(checked ? "pro" : "simple")}
        aria-label={pro ? "Switch to Simple mode" : "Switch to Pro mode"}
      />
    </label>
  );
}
