"use client";

import { useEffect, useState } from "react";
import styles from "./theme-toggle.module.css";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "card-validation-theme";

const resolveSystemTheme = (): "light" | "dark" =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (mode: ThemeMode) => {
  const resolved = mode === "system" ? resolveSystemTheme() : mode;
  document.documentElement.setAttribute("data-theme", resolved);
};

export const ThemeToggle = () => {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initialMode: ThemeMode =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";

    applyTheme(initialMode);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, initialMode);
    }

    if (initialMode !== "system") {
      const id = window.setTimeout(() => setMode(initialMode), 0);
      return () => window.clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  const update = (next: ThemeMode) => {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <div className={styles.wrapper} role="group" aria-label="Theme mode">
      <button
        className={`${styles.button} ${mode === "light" ? styles.active : ""}`}
        onClick={() => update("light")}
        type="button"
      >
        Light
      </button>
      <button
        className={`${styles.button} ${mode === "dark" ? styles.active : ""}`}
        onClick={() => update("dark")}
        type="button"
      >
        Dark
      </button>
      <button
        className={`${styles.button} ${mode === "system" ? styles.active : ""}`}
        onClick={() => update("system")}
        type="button"
      >
        System
      </button>
    </div>
  );
};
