import React, { useState } from "react";
import { Bookmark, ChevronDown } from "lucide-react";

// One thread back through their own material: the label is always there,
// the detail opens only if they want it, and a point can be kept.
export default function ExploreThread({ label, detail, kept, onKeep }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="tw-thread tw-thread-item">
      <div className="tw-thread-row">
        <button
          type="button"
          className="tw-thread-toggle"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span className="tw-thread-label">{label}</span>
          <ChevronDown className={`tw-thread-chev ${open ? "is-open" : ""}`} />
        </button>
        <button
          type="button"
          className={`tw-keep ${kept ? "is-kept" : ""}`}
          onClick={() => onKeep && onKeep()}
          aria-pressed={!!kept}
          aria-label={kept ? "Let this point go" : "Keep this point"}
          title={kept ? "Kept" : "Keep this point"}
        >
          <Bookmark className="w-3.5 h-3.5" fill={kept ? "currentColor" : "none"} />
        </button>
      </div>
      {open && <p className="tw-thread-detail">{detail}</p>}
    </li>
  );
}