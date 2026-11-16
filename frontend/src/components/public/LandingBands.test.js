import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { DebriefSpotlight, SchoolBand } from "./LandingBands";
import { schools } from "../../content/schools";

const html = (node) =>
  renderToString(<StaticRouter location="/">{node}</StaticRouter>);

test("the prerendered debrief shows the finished score and says it is not an admit prediction", () => {
  const out = html(<DebriefSpotlight />);
  expect(out).toContain("lp-debrief-card is-shown");
  expect(out).toMatch(/lp-debrief-num">72</);
  expect(out).toContain("not your admit chances");
});

test("the school band links every school once for keyboards and screen readers", () => {
  const out = html(<SchoolBand />);
  for (const school of schools)
    expect(out).toContain(`href="/schools/${school.slug}"`);
  const focusable =
    out.match(/<a href="\/schools\/[^"]+"(?! tabindex="-1")/g) || [];
  expect(focusable).toHaveLength(schools.length);
});

test("the school band offers the chips past the first 18 behind a show-more button", () => {
  const out = html(<SchoolBand />);
  const extra = schools.length - 18;
  expect(out).toContain(`Show ${extra} more schools`);
  expect(out).toContain('aria-expanded="false"');
  // Each row renders two copies (the second only loops the marquee), so every extra chip appears twice.
  expect(out.match(/class="lp-chip-extra"/g)).toHaveLength(2 * extra);
});
