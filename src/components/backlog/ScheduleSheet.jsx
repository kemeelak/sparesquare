import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";

export default function ScheduleSheet({ habit, onClose, onSchedule }) {
  const [date, setDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (h) => {
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Schedule: {habit.title}</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
              <X className="w-5 h-5 text-[#8A8580]" />
            </button>
          </div>

          {/* Date selector */}
          <div className="flex items-center justify-between bg-[#F5F0EB] rounded-xl p-3 mb-4">
            <button onClick={() => setDate(subDays(date, 1))} className="p-1">
              <ChevronLeft className="w-4 h-4 text-[#8A8580]" />
            </button>
            <p className="text-sm font-medium text-[#1A1A1A]">{format(date, "EEEE, MMM d")}</p>
            <button onClick={() => setDate(addDays(date, 1))} className="p-1">
              <ChevronRight className="w-4 h-4 text-[#8A8580]" />
            </button>
          </div>

          {/* Hour picker */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {hours.map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHour(h)}
                className={`py-2 px-3 rounded-xl text-sm font-medium transition-all
                  ${selectedHour === h
                    ? "bg-[#7C9A82] text-white"
                    : "bg-[#F5F0EB] text-[#8A8580] hover:bg-[#E8E4DF]"
                  }`}
              >
                {formatHour(h)}
              </button>
            ))}
          </div>

          <Button
            onClick={() => onSchedule(selectedHour, date)}
            disabled={selectedHour === null}
            className="w-full h-12 rounded-xl bg-[#7C9A82] hover:bg-[#6B8A71] text-white"
          >
            Schedule at {selectedHour !== null ? formatHour(selectedHour) : "..."}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}