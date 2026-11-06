import React from "react";
import { renderToString } from "react-dom/server";
import StaticSite from "../../seo/StaticSite";
import { indiaHub, indiaProgrammeRows } from "../../content/indiaHub";

const page = (path) => renderToString(<StaticSite path={path} />);

// jsdom looks like a browser to ThemeProvider, which then warns about its layout effect on the server.
beforeAll(() => {
  const log = console.error;
  jest.spyOn(console, "error").mockImplementation((message, ...rest) => {
    if (!String(message).includes("useLayoutEffect does nothing on the server"))
      log(message, ...rest);
  });
});
afterAll(() => console.error.mockRestore());

test("the Indian mock interview page links every programme's school page and avoids pilot wording", () => {
  const out = page(indiaHub.path);
  const rows = indiaProgrammeRows().flatMap((group) => group.rows);
  expect(rows.length).toBeGreaterThan(20);
  for (const { school } of rows)
    expect(out).toContain(`href="/schools/${school.slug}"`);
  expect(out).toContain("Is the mock interview free?");
  // Visible copy only: the header keeps an internal class name with "pilot" in it.
  expect(out.replace(/<[^>]+>/g, " ")).not.toMatch(/pilot/i);
});

test("a school page leads with its flagship programme's interview facts", () => {
  const out = page("/schools/isb");
  expect(out).toContain("ISB PGP interview, as ISB describes it:");
  expect(out).toContain(`href="${indiaHub.path}"`);
});
