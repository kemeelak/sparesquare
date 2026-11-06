import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, ArrowUp, X } from "lucide-react";

export default function DumpComposer({ onDrop, busy }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const pickPhoto = (chosen) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(chosen);
    setPreview(chosen ? URL.createObjectURL(chosen) : null);
  };

  const send = () => {
    if (busy) return;
    if (!text.trim() && !file) return;
    const written = text;
    const chosen = file;
    setText("");
    pickPhoto(null);
    if (inputRef.current) inputRef.current.value = "";
    // If it never made it in, put their words back rather than swallow them.
    onDrop({ text: written.trim(), file: chosen }).catch(() => {
      setText(written);
      pickPhoto(chosen);
    });
  };

  const canSend = (text.trim() || file) && !busy;

  return (
    <div className="border-t border-[#E8E4DF] bg-white/80 backdrop-blur-lg mb-14 lg:mb-0">
      <div className="max-w-2xl mx-auto p-4">
        {preview && (
          <div className="relative inline-block mb-3">
            <img src={preview} alt="The photo you're adding" className="h-24 w-24 object-cover rounded-xl border border-[#E8E4DF]" />
            <button onClick={() => pickPhoto(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center" aria-label="Remove photo">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => inputRef.current?.click()} disabled={busy}
            className="p-2.5 rounded-xl text-[#8A8580] hover:bg-[#F5F0EB] hover:text-[#1A1A1A] transition-colors flex-shrink-0 disabled:opacity-50"
            aria-label="Add a photo">
            <ImagePlus className="w-5 h-5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Rant, vent, drop a photo. However it comes out is fine."
            className="flex-1 resize-none bg-[#F5F0EB] rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#B0AAA4] focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 max-h-40"
            style={{ minHeight: "46px" }}
          />
          <button onClick={send} disabled={!canSend}
            className="w-11 h-11 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#333] transition-colors disabled:opacity-30"
            aria-label="Drop it in">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0] || null)} />
      </div>
    </div>
  );
}