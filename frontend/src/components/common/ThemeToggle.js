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
      aria-label={`${isDarkMode ? "Light" : "Dark"} mode`}
      title={`${isDarkMode ? "Light" : "Dark"} mode`}
    >
      {isDarkMode ? <SunIcon /> : <MoonIcon />}
      {showLabel && <span>{isDarkMode ? "Light" : "Dark"} mode</span>}
    </button>
  );
}
