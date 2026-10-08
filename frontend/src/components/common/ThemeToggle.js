import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { MoonIcon, SunIcon } from "../../app/icons";

export default function ThemeToggle({ showLabel = false }) {
  const { isDarkMode, setIsDarkMode } = useTheme();
  return (
    <button
      type="button"
      className={`theme-toggle ${showLabel ? "theme-toggle-label" : ""}`}
      onClick={() => setIsDarkMode(!isDarkMode)}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
    >
      {isDarkMode ? <SunIcon /> : <MoonIcon />}
      {showLabel && (
        <span>{isDarkMode ? "Light appearance" : "Dark appearance"}</span>
      )}
    </button>
  );
}
