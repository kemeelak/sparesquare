import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, Square, Loader2, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { extractAnswersFromTranscript } from "./extractAnswers";

const PROMPTS = [
  "What does a typical day look like for you?",
  "What are you hoping to get help with?",
  "What's gotten in your way before?",
];

export default function VoiceSpill({ onResult, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | recording | processing | error
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = handleStop;
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError("I couldn't access your microphone. Check your browser permissions, or use the options instead.");
      setStatus("error");
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus("processing");
  };

  const handleStop = async () => {
    try {
      const type = recorderRef.current?.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : "webm";
      const file = new File([new Blob(chunksRef.current, { type })], `voice.${ext}`, { type });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
      const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: signed_url });
      const text = typeof transcript === "string" ? transcript : transcript?.text || "";
      if (!text.trim()) throw new Error("empty");
      const extracted = await extractAnswersFromTranscript(text);
      onResult(extracted, text);
    } catch (e) {
      setError("Hmm, I couldn't make that out. Want to try again?");
      setStatus("error");
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#E8E4DF] px-5 py-6 shadow-sm text-center relative"
    >
      <button onClick={onClose} className="absolute top-3 right-3 text-[#B0AAA4] hover:text-[#1A1A1A]" aria-label="Close">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[#D4A574]" />
        <span className="text-xs font-medium text-[#D4A574]">Just tell me</span>
      </div>
      <h2 className="font-bold text-[#1A1A1A] text-base mb-1">Spill it — I'm listening</h2>
      <p className="text-xs text-[#8A8580] mb-4">Talk for 30 seconds or a few minutes. I'll fill in the blanks for you.</p>

      {status !== "processing" && (
        <ul className="text-xs text-[#8A8580] space-y-1 mb-5">
          {PROMPTS.map((p) => <li key={p}>“{p}”</li>)}
        </ul>
      )}

      {status === "processing" ? (
        <div className="py-4">
          <Loader2 className="w-8 h-8 text-[#D4A574] mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium text-[#1A1A1A]">Listening back to what you said...</p>
        </div>
      ) : status === "recording" ? (
        <div>
          <p className="text-2xl font-mono text-[#1A1A1A] mb-3">{mm}:{ss}</p>
          <button
            onClick={stop}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center mx-auto animate-pulse"
            aria-label="Stop recording"
          >
            <Square className="w-6 h-6 fill-current" />
          </button>
          <p className="text-xs text-[#8A8580] mt-3">Tap to finish</p>
        </div>
      ) : (
        <div>
          <button
            onClick={start}
            className="w-16 h-16 rounded-full bg-[#1A1A1A] hover:bg-[#333] text-white flex items-center justify-center mx-auto"
            aria-label="Start recording"
          >
            <Mic className="w-6 h-6" />
          </button>
          <p className="text-xs text-[#8A8580] mt-3">Tap to start</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      {status === "error" && (
        <Button variant="outline" onClick={() => setStatus("idle")} className="mt-3 rounded-xl border-[#E8E4DF]">
          Try again
        </Button>
      )}
    </motion.div>
  );
}