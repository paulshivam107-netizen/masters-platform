import React from "react";
import { renderToString } from "react-dom/server";
import LiveInterview from "./LiveInterview";
import { EXCHANGE } from "../common/InterviewPreview";

const html = renderToString(<LiveInterview />);

test("prerenders the finished exchange, quote and follow-up included", () => {
  expect(html).toContain(`<mark>${EXCHANGE.quote}</mark>`);
  expect(html).toContain(`${EXCHANGE.followUp}</span>`);
});

test("screen readers get the whole exchange once; the typing card is hidden from them", () => {
  expect(html).toMatch(/<p class="sr-only">Example mock interview\. Interviewer:/);
  expect(html).toContain('class="lp-live-card" aria-hidden="true"');
});
