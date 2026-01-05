import { DEFAULT_BACKGROUND_BY_THEME } from "../../../graph/config";
import type { Theme } from "./types";

export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem("theme");
  return v === "dark" || v === "light" ? v : null;
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
}

export function getActiveTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function persistTheme(theme: Theme) {
  window.localStorage.setItem("theme", theme);
}

export const getDefaultBackgroundForTheme = (theme: Theme) =>
  theme === "light"
    ? DEFAULT_BACKGROUND_BY_THEME.light
    : DEFAULT_BACKGROUND_BY_THEME.dark;
