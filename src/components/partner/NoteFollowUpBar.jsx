import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cleanText } from "@/lib/cleanText";
import { ArrowUp, ImagePlus, Loader2, Mic, Square, X } from "lucide-react";

// Adding onto an open dump: words, a photo, a voice note, or all of it.
export default function NoteFollowUpBar({ onAdd, partnerName }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [voice, setVoice] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | recording | working | saving
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const textRef = useRef(null);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, voice, preview, status]);

  const pickPhoto = (chosen) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(chosen);
    setPreview(chosen ? URL.createObjectURL(chosen) : null);
    if (fileRef.current) fileRef.current.value = "";
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
    setStatus("working");
  };

  // The recording is kept so they can hear it back, and the words land in the box.
  const finishRecording = async () => {
    try {
      const type = recorderRef.current?.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : "webm";
      const recording = new File([new Blob(chunksRef.current, { type })], `note.${ext}`, { type });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: recording });
      await base44.entities.VoiceNote.create({ file_uri });
      setVoice(file_uri);

      try {
        const res = await base44.functions.invoke("transcribeAudio", { file_uri });
        const said = cleanText((res?.data?.transcript || "").trim());
        if (said) setText((prev) => (prev ? `${prev} ${said}` : said));
      } catch (e) {
        setError("Saved the recording, but I couldn't make out the words.");
      }
      setStatus("idle");
    } catch (e) {
      setError("That recording didn't save. Try once more, or type it.");
      setStatus("idle");
    }
  };

  const clear = () => {
    setText("");
    pickPhoto(null);
    setVoice(null);
  };

  const send = async () => {
    if (status !== "idle") return;
    if (!text.trim() && !file && !voice) return;
    const written = text;
    const chosen = file;
    const recorded = voice;
    setStatus("saving");
    setError("");
    try {
      let photo_url = null;
      if (chosen) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: chosen });
        photo_url = file_uri;
      }
      await onAdd({ text: written.trim(), photo_url, voice_uri: recorded });
      clear();
    } catch (e) {
      // If it never made it in, put what they gave back rather than swallow it.
      setText(written);
      pickPhoto(chosen);
      setVoice(recorded);
      setError("That didn't save. Try again in a moment.");
    }
    setStatus("idle");
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const canSend = (text.trim() || file || voice) && status === "idle";

  return (
    <div className="tw-composer">
      {(preview || voice) && status !== "recording" && (
        <div className="tw-attach-row">
          {preview && (
            <div className="tw-thumb-wrap">
              <img src={preview} alt="The photo you're adding" className="tw-thumb" />
              <button onClick={() => pickPhoto(null)} className="tw-dismiss" aria-label="Remove photo">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {voice && (
            <span className="tw-voice-chip">
              <Mic />
              Recording attached
              <button onClick={() => setVoice(null)} aria-label="Remove recording">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
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
      ) : status === "working" ? (
        <div className="tw-transcribing">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#e9b56d" }} />
          <span>Writing down what you said…</span>
        </div>
      ) : (
        <div className="tw-compose-row tw-compose-stack">
          <button onClick={startRecording} disabled={status === "saving"} className="tw-round" aria-label="Talk instead of typing">
            <Mic />
          </button>
          <textarea
            ref={textRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !file && !voice) {
                e.preventDefault();
                send();
              }
            }}
            aria-label="Add a note to this"
            className="tw-textarea"
            placeholder={`Add to this note, or tell ${partnerName} more`}
          />
          <button onClick={() => fileRef.current?.click()} disabled={status === "saving"} className="tw-tool" aria-label="Add a photo">
            <ImagePlus />
          </button>
          <button onClick={send} disabled={!canSend} className="tw-send" aria-label="Add this note">
            {status === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => pickPhoto(e.target.files?.[0] || null)} />

      {error ? <p className="tw-error">{error}</p> : null}
    </div>
  );
}