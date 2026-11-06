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
    <div className="tw-composer">
      {preview && status === "idle" && (
        <div className="tw-thumb-wrap">
          <img src={preview} alt="The photo you're adding" className="tw-thumb" />
          <button onClick={() => pickPhoto(null)} className="tw-dismiss" aria-label="Remove photo">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {status === "recording" ? (
        <div className="tw-compose-row">
          <span className="tw-live" aria-hidden="true" />
          <span className="tw-timer">{mm}:{ss}</span>
          <span className="tw-listening">Go on, I'm listening.</span>
          <button onClick={stopRecording} className="tw-stop" aria-label="Stop recording">
            <Square className="w-4 h-4" style={{ fill: "currentColor", stroke: "none" }} />
          </button>
        </div>
      ) : status === "transcribing" ? (
        <div className="tw-transcribing">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#e9b56d" }} />
          <span>Writing down what you said…</span>
        </div>
      ) : (
        <div className="tw-compose-row tw-compose-stack">
          <button onClick={startRecording} disabled={busy} className="tw-round" aria-label="Talk instead of typing">
            <Mic />
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
            aria-label="Dump"
            placeholder="Talk it out with the mic, or type however it comes out."
            className="tw-textarea"
          />
          <button onClick={() => inputRef.current?.click()} disabled={busy} className="tw-tool" aria-label="Add a photo">
            <ImagePlus />
          </button>
          <button onClick={send} disabled={!canSend} className="tw-send" aria-label="Drop it in">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp />}
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => pickPhoto(e.target.files?.[0] || null)} />

      {error ? (
        <p className="tw-error">{error}</p>
      ) : (!text && !file && status === "idle" && (
        <p className="tw-hint">Hit the mic and just talk. Easier than finding the words to type.</p>
      ))}
    </div>
  );
}