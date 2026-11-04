import React from "react";

export const LOGO_URL =
  "https://media.base44.com/images/public/69950002c8ede118ef7fea1a/ef173c53f_logo.png";

// The real SpareSquare mark. Drop it inside any square container — it fills the
// container and inherits its corner radius.
export default function Logo({ className = "" }) {
  return (
    <img
      src={LOGO_URL}
      alt="SpareSquare"
      className={`w-full h-full object-contain rounded-[inherit] ${className}`}
    />
  );
}