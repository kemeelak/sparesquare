import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import ActionCard from "./ActionCard";

function cleanContent(content) {
  return content
    .replace(/```habit[\s\S]*?```/g, "")
    .replace(/```sleep[\s\S]*?```/g, "")
    .replace(/```json[\s\S]*?```/g, "")
    .trim();
}

function parseActions(content) {
  const actions = [];

  const habitRegex = /```habit\s*([\s\S]*?)\s*```/g;
  let m;
  while ((m = habitRegex.exec(content)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      actions.push({ type: "habit", ...data });
    } catch (e) { /* skip */ }
  }

  const sleepRegex = /```sleep\s*([\s\S]*?)\s*```/g;
  while ((m = sleepRegex.exec(content)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      actions.push({ type: "sleep_update", ...data });
    } catch (e) { /* skip */ }
  }

  return actions;
}

export default function ChatBubble({ message }) {
  const isUser = message.role === "user";
  const displayContent = cleanContent(message.content || "");
  const actions = isUser ? [] : parseActions(message.content || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <span className="text-white text-[10px] font-bold">S²</span>
        </div>
      )}
      <div className={`max-w-[82%] ${isUser ? "" : "flex-1"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-[#1A1A1A] text-white rounded-br-md"
              : "bg-white text-[#1A1A1A] border border-[#E8E4DF] rounded-bl-md"
          }`}
        >
          <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1">
            <ReactMarkdown>{displayContent}</ReactMarkdown>
          </div>
        </div>
        {actions.map((action, i) => (
          <ActionCard key={i} action={action} source={message.thread_id ? "Thread suggestion" : "Partner suggestion"} />
        ))}
      </div>
    </motion.div>
  );
}