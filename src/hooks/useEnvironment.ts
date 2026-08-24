import { useEffect, useState, useCallback } from "react";

export type EnvironmentId = string;


export interface EnvironmentInfo {
  id: EnvironmentId;
  label: string;
  shortLabel: string;
  description: string;
  /** HSL color used for accents/badges, references the design system primary by default. */
  accent: string;
}

export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentInfo> = {
  barcarena: {
    id: "barcarena",
    label: "Barcarena - Alunorte",
    shortLabel: "Barcarena",
    description: "Ambiente principal e existente do sistema.",
    accent: "210 85% 55%",
  },
  paragominas: {
    id: "paragominas",
    label: "Paragominas",
    shortLabel: "Paragominas",
    description: "Nova operação — mesma estrutura, dados independentes.",
    accent: "140 60% 45%",
  },
};

const STORAGE_KEY = "selected_environment";
const EVENT_NAME = "environment-changed";

function readStored(): EnvironmentId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (raw && /^[a-z0-9_-]{2,}$/i.test(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}


export function useEnvironment() {
  const [environment, setEnvironmentState] = useState<EnvironmentId | null>(() => readStored());

  useEffect(() => {
    const handler = () => setEnvironmentState(readStored());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setEnvironment = useCallback((env: EnvironmentId) => {
    localStorage.setItem(STORAGE_KEY, env);
    sessionStorage.setItem(STORAGE_KEY, env);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const clearEnvironment = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const info = environment
    ? ENVIRONMENTS[environment] ?? {
        id: environment,
        label: environment,
        shortLabel: environment,
        description: "",
        accent: "210 85% 55%",
      }
    : null;

  return {
    environment,
    info,
    setEnvironment,
    clearEnvironment,
  };
}


export function getStoredEnvironment(): EnvironmentId | null {
  return readStored();
}

export function clearStoredEnvironment() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}
