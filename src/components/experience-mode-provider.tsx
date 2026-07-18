"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  EXPERIENCE_MODE_STORAGE_KEY,
  nextExperienceMode,
  parseExperienceMode,
  type ExperienceMode,
} from "@/lib/experience-mode";

interface ExperienceModeContextValue {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  toggleMode: () => void;
}

const ExperienceModeContext = createContext<ExperienceModeContextValue | undefined>(undefined);
const experienceModeEvent = "rulewallet:experience-mode-change";

function subscribeToExperienceMode(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(experienceModeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(experienceModeEvent, onStoreChange);
  };
}

function getExperienceModeSnapshot() {
  return parseExperienceMode(window.localStorage.getItem(EXPERIENCE_MODE_STORAGE_KEY));
}

export function ExperienceModeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore<ExperienceMode>(subscribeToExperienceMode, getExperienceModeSnapshot, () => "simple");

  const setMode = useCallback((nextMode: ExperienceMode) => {
    window.localStorage.setItem(EXPERIENCE_MODE_STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(experienceModeEvent));
  }, []);

  const toggleMode = useCallback(() => {
    setMode(nextExperienceMode(mode));
  }, [mode, setMode]);

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode]);

  return <ExperienceModeContext.Provider value={value}>{children}</ExperienceModeContext.Provider>;
}

export function useExperienceMode() {
  const value = useContext(ExperienceModeContext);
  if (!value) throw new Error("useExperienceMode must be used within ExperienceModeProvider.");
  return value;
}
