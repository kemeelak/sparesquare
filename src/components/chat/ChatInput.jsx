import React, { useState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={placeholder || "Type a message..."}
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm
            focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A]/20
            placeholder:text-[#B0AAA4] disabled:opacity-50 transition-all"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="submit"
        disabled={!text.trim() || disabled}
        className="w-11 h-11 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center
          disabled:opacity-30 transition-opacity flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </motion.button>
    </form>
  );
}