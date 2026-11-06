import React, { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { invokeAI } from "@/lib/plans";
import { buildDraftPrompt, DRAFT_SCHEMA } from "./draftPrompt";

// The message itself, written out so they can send it today instead of thinking about it again.
export default function ActionDraft({ entry, kind }) {
  const saved = entry.action_draft;
  const [subject, setSubject] = useState(saved?.subject || "");
  const [bodyText, setBodyText] = useState(saved?.body || "");
  const [loading, setLoading] = useState(!saved?.body);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const isEmail = kind === "email";

  const persist = async (nextSubject, nextBody) => {
    await base44.entities.DumpEntry.update(entry.id, {
      action_draft: { subject: nextSubject, body: nextBody, at: new Date().toISOString() },
    });
    queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });
  };

  const write = async () => {
    setLoading(true);
    setFailed(false);
    const res = await invokeAI("dump_draft", {
      prompt: buildDraftPrompt({ entry, kind }),
      response_json_schema: DRAFT_SCHEMA,
    });
    setLoading(false);
    if (!res?.body) {
      setFailed(true);
      return;
    }
    setSubject(res.subject || "");
    setBodyText(res.body);
    persist(res.subject || "", res.body);
  };

  useEffect(() => {
    if (!saved?.body) write();
  }, []);

  const copy = async () => {
    const text = isEmail && subject ? `${subject}\n\n${bodyText}` : bodyText;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    persist(subject, bodyText);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <p className="tw-draft-loading">
        <Loader2 className="w-4 h-4 animate-spin" /> Writing it…
      </p>
    );
  }

  if (failed || !bodyText) {
    return (
      <div className="tw-foot">
        <span className="tw-small" style={{ margin: 0, flex: 1 }}>I couldn't write it just now.</span>
        <button onClick={write} className="tw-later">Try again</button>
      </div>
    );
  }

  return (
    <div className="tw-draft">
      <div className="tw-draft-head">
        <p className="tw-stamp">{isEmail ? "Your email" : "Your message"}</p>
        <button onClick={write} className="tw-block-edit" aria-label="Write it again">
          <RefreshCw />
          Write again
        </button>
      </div>

      {isEmail && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => persist(subject, bodyText)}
          className="tw-draft-subject"
          aria-label="Subject line"
          placeholder="Subject"
        />
      )}

      <textarea
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
        onBlur={() => persist(subject, bodyText)}
        className="tw-edit tw-draft-body"
        aria-label="Your draft"
      />

      <div className="tw-foot">
        <button onClick={copy} className="tw-do tw-do-done">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        {isEmail && (
          <a
            href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`}
            onClick={() => persist(subject, bodyText)}
            className="tw-later"
          >
            <Mail className="w-3.5 h-3.5" />
            Open in mail
          </a>
        )}
      </div>
    </div>
  );
}