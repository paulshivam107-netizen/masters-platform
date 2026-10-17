import React from "react";

/**
 * Standard page header for every workspace view: eyebrow, title, optional
 * subtitle and an actions slot. Styles live in views/Workspace.css (ws-page-header).
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  as: Heading = "h1",
  children,
}) {
  return (
    <header className="ws-page-header">
      <div className="ws-page-header__main">
        {eyebrow && (
          <p className="ws-eyebrow">
            <span aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <Heading className="ws-page-title">{title}</Heading>
        {subtitle && <p className="ws-page-subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="ws-page-header__actions">{actions}</div>}
    </header>
  );
}
