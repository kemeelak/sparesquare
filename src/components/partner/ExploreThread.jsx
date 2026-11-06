import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// One thread back through their own material: the label is always there,
// the detail opens only if they want it.
export default function ExploreThread({ label, detail }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="tw-thread tw-thread-item">
      <button
        type="button"
        className="tw-thread-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="tw-thread-label">{label}</span>
        <ChevronDown className={`tw-thread-chev ${open ? "is-open" : ""}`} />
      </button>
      {open && <p className="tw-thread-detail">{detail}</p>}
    </li>
  );
}