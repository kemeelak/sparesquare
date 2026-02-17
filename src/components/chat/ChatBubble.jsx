import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

export default function ChatBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <span className="text-white text-[10px] font-bold">S²</span>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[#1A1A1A] text-white rounded-br-md"
            : "bg-white text-[#1A1A1A] border border-[#E8E4DF] rounded-bl-md"
        }`}
      >
        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}