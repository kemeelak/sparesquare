import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cleanText } from "@/lib/cleanText";
import { ImagePlus, Loader2, ArrowUp, X, Mic, Square } from "lucide-react";

export default function DumpComposer({ onDrop, busy }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | recording | transcribing
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const pickPhoto = (chosen) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(chosen);
    setPreview(chosen ? URL.createObjectURL(chosen) : null);
  };

  const send = () => {
    if (busy || status !== "idle") return;
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

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = finishRecording;
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError("I can't reach your microphone. Allow it in your browser, or type it below.");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus("transcribing");
  };

  // What they said becomes the dump itself — the recording stays in private storage.
  const finishRecording = async () => {
    try {
      const type = recorderRef.current?.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : "webm";
      const recording = new File([new Blob(chunksRef.current, { type })], `dump.${ext}`, { type });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: recording });
      await base44.entities.VoiceNote.create({ file_uri });
      const res = await base44.functions.invoke("transcribeAudio", { file_uri });
      const said = cleanText((res?.data?.transcript || "").trim());
      if (!said) throw new Error("empty");
      setText((prev) => (prev ? `${prev} ${said}` : said));
      setStatus("idle");
    } catch (e) {
      setError("I couldn't make that out. Try once more, or type it.");
      setStatus("idle");
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const canSend = (text.trim() || file) && !busy && status === "idle";

  return (
    <div className="border-t border-[#E8E4DF] bg-white/80 backdrop-blur-lg mb-14 lg:mb-0">
      <div className="max-w-2xl mx-auto p-4">
        {preview && status === "idle" && (
          <div className="relative inline-block mb-3">
            <img src={preview} alt="The photo you're adding" className="h-24 w-24 object-cover rounded-xl border border-[#E8E4DF]" />
            <button onClick={() => pickPhoto(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center" aria-label="Remove photo">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {status === "recording" ? (
          <div className="flex items-center gap-3 bg-[#F5EDE4] border border-[#D4A574]/50 rounded-2xl px-4 py-3" style={{ minHeight: "46px" }}>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="font-mono text-sm text-[#1A1A1A] tabular-nums">{mm}:{ss}</span>
            <span className="text-xs text-[#8A8580] flex-1 min-w-0 truncate">Go on, I'm listening.</span>
            <button onClick={stopRecording} className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center flex-shrink-0" aria-label="Stop recording">
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        ) : status === "transcribing" ? (
          <div className="flex items-center gap-3 bg-[#F5F0EB] rounded-2xl px-4 py-3" style={{ minHeight: "46px" }}>
            <Loader2 className="w-4 h-4 text-[#D4A574] animate-spin flex-shrink-0" />
            <span className="text-sm text-[#4A5568]">Writing down what you said…</span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={startRecording}
              disabled={busy}
              className="relative w-11 h-11 rounded-full bg-[#D4A574] text-[#1A1A1A] flex items-center justify-center flex-shrink-0 hover:bg-[#c7955f] transition-colors disabled:opacity-50"
              aria-label="Talk instead of typing"
            >
              <Mic className="w-5 h-5" />
              {!text && !file && <span className="absolute inset-0 rounded-full ring-4 ring-[#D4A574]/25 animate-pulse" />}
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
              placeholder="Talk it out with the mic, or type however it comes out."
              className="flex-1 resize-none bg-[#F5F0EB] rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#B0AAA4] focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 max-h-40"
              style={{ minHeight: "46px" }}
            />
            <button onClick={() => inputRef.current?.click()} disabled={busy}
              className="p-2.5 rounded-xl text-[#8A8580] hover:bg-[#F5F0EB] hover:text-[#1A1A1A] transition-colors flex-shrink-0 disabled:opacity-50"
              aria-label="Add a photo">
              <ImagePlus className="w-5 h-5" />
            </button>
            <button onClick={send} disabled={!canSend}
              className="w-11 h-11 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#333] transition-colors disabled:opacity-30"
              aria-label="Drop it in">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0] || null)} />

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        {!error && !text && !file && status === "idle" && (
          <p className="text-[11px] text-[#8A8580] mt-2 pl-[3.25rem]">
            Hit the mic and just talk. Easier than finding the words to type.
          </p>
        )}
      </div>
    </div>
  );
}