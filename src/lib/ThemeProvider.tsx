"use client";

import { useEffect } from "react";

/**
 * Syncs dark/light theme to <html> class.
 * - Defaults to browser preference (prefers-color-scheme)
 * - Alt+T toggles manually; stored in localStorage
 * - Clearing localStorage reverts to browser default
 */
export function ThemeProvider() {
  useEffect(() => {
    function applyTheme() {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      } else if (stored === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        // Follow browser default
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    }

    applyTheme();

    // Listen for OS theme changes (only applies when no manual override)
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!localStorage.getItem("theme")) applyTheme();
    };
    mq.addEventListener("change", onSystemChange);

    // Alt+T toggles theme
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        const isDark = document.documentElement.classList.contains("dark");
        const next = isDark ? "light" : "dark";
        localStorage.setItem("theme", next);
        applyTheme();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      mq.removeEventListener("change", onSystemChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
