import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import TopControls from "./TopControls";

const html = (props) =>
  renderToString(
    <StaticRouter location="/app/today">
      <TopControls
        globalSearch=""
        profileMenuRef={{ current: null }}
        isProfileMenuOpen={false}
        notificationCount={0}
        user={{ name: "Test User" }}
        {...props}
      />
    </StaticRouter>,
  );

test("the top bar offers New by default", () => {
  expect(html({})).toContain('data-testid="header-create-button"');
});

test("a page with its own add button can drop the top-bar New, and keeps the account menu", () => {
  const out = html({ showCreate: false });
  expect(out).not.toContain('data-testid="header-create-button"');
  expect(out).toContain('data-testid="profile-menu-trigger"');
});
