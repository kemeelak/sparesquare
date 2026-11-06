import React from "react";
import { Pencil } from "lucide-react";

// A block's label with its own edit control, right where the text lives.
export default function NoteBlockHead({ label, onEdit, editing }) {
  if (!onEdit || editing) return <p className="tw-stamp">{label}</p>;

  return (
    <div className="tw-block-head">
      <p className="tw-stamp">{label}</p>
      <button type="button" className="tw-block-edit" onClick={onEdit} aria-label={`Edit ${label}`}>
        <Pencil />
        Edit
      </button>
    </div>
  );
}