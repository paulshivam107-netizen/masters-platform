import React, { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import DotGrid from "../common/DotGrid/DotGrid";

// The canvas needs real colours, not CSS variables, so the two themes are listed here.
// Resting dots are visible at a glance; the cursor brightens the ones near it.
const COLOURS = {
  light: { base: "#bccfb6", active: "#2f6b50" },
  dark: { base: "#2a4535", active: "#d7ecac" },
};

export default function HeroDots() {
  const { isDarkMode } = useTheme();
  // Browser only: the prerendered hero keeps its flat ground and gains the dots on load.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const colours = COLOURS[isDarkMode ? "dark" : "light"];
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
