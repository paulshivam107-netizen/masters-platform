import React, { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import DotGrid from "../common/DotGrid/DotGrid";

// The canvas needs real colours, not CSS variables with a mix in them. The tokens
// --dots-base and --dots-active in index.css are plain hex and win; these are the fallback.
// Resting dots are visible at a glance; the cursor brightens the ones near it.
const COLOURS = {
  light: { base: "#dcd3c0", active: "#17140f" },
  dark: { base: "#2b2721", active: "#f3eee3" },
};

export default function HeroDots() {
  const { isDarkMode } = useTheme();
  // Browser only: the prerendered hero keeps its flat ground and gains the dots on load.
  // An effect (not render) so the theme attribute is already set; a palette can override the
  // defaults with plain-hex --dots-base / --dots-active.
  const [colours, setColours] = useState(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const fallback = COLOURS[isDarkMode ? "dark" : "light"];
    setColours({
      base: css.getPropertyValue("--dots-base").trim() || fallback.base,
      active: css.getPropertyValue("--dots-active").trim() || fallback.active,
    });
  }, [isDarkMode]);
  if (!colours) return null;
  return (
    <div className="lp-hero-dots" aria-hidden="true">
      <DotGrid
        baseColor={colours.base}
        activeColor={colours.active}
        dotSize={3}
        gap={22}
        clickShock={false}
      />
    </div>
  );
}
