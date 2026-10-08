import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

const ThemeContext = createContext(null);
const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
const readPreference = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = readPreference("ui_theme", "system");
    return ["light", "dark", "system"].includes(saved) ? saved : "system";
  });
  const [systemDark, setSystemDark] = useState(() =>
    Boolean(
      typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches,
    ),
  );
  const [reducedMotion, setReducedMotion] = useState(
    () => readPreference("ui_reduced_motion", "false") === "true",
  );
  const isDarkMode = theme === "dark" || (theme === "system" && systemDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => setSystemDark(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useBrowserLayoutEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDarkMode ? "#111216" : "#f4f6f3");
    try {
      localStorage.setItem("ui_theme", theme);
      localStorage.setItem("ui_reduced_motion", String(reducedMotion));
    } catch {
      /* The theme still works when browser storage is unavailable. */
    }
  }, [theme, isDarkMode, reducedMotion]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDarkMode,
        setIsDarkMode: (dark) => setTheme(dark ? "dark" : "light"),
        reducedMotion,
        setReducedMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
