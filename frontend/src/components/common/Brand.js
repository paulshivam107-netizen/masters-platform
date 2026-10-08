import React from "react";
import { Link } from "react-router-dom";
import { BrandLogoIcon } from "../../app/icons";

export default function Brand({ to = "/", compact = false, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="brand" aria-label="Masters home">
      <span className="brand-mark">
        <BrandLogoIcon />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          masters<span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
