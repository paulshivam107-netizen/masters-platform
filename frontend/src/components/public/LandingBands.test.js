import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { DebriefSpotlight, SchoolBand } from "./LandingBands";
import { schools } from "../../content/schools";

const html = (node) => renderToString(<StaticRouter location="/">{node}</StaticRouter>);

test("the prerendered debrief shows the finished score and says it is not an admit prediction", () => {
  const out = html(<DebriefSpotlight />);
  expect(out).toContain('lp-debrief-card is-shown');
  expect(out).toMatch(/lp-debrief-num">72</);
  expect(out).toContain("not your admit chances");
});

test("the school band links every school once for keyboards and screen readers", () => {
  const out = html(<SchoolBand />);
  for (const school of schools) expect(out).toContain(`href="/schools/${school.slug}"`);
  const focusable = out.match(/<a href="\/schools\/[^"]+"(?! tabindex="-1")/g) || [];
  expect(focusable).toHaveLength(schools.length);
});
