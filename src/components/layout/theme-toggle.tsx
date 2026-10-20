"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/** Light unless the reader has chosen dark; the OS preference is ignored. */
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Re-renders when the data-theme attribute changes. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * Light/dark switch. The theme is unknown on the server, so both icons are
 * rendered and CSS shows the right one before hydration (see globals.css);
 * aria-pressed fills in once the component knows the current theme.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies to this page.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === null ? undefined : theme === "dark"}
      className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-edge bg-paper-raised text-ink transition-transform hover:-rotate-12"
    >
      <span className="sr-only">Dark mode</span>
      <Moon aria-hidden="true" className="theme-icon-dark size-[1.15rem]" />
      <Sun aria-hidden="true" className="theme-icon-light size-[1.15rem]" />
    </button>
  );
}
