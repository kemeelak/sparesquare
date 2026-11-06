import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { bucketSettings, mixFromPriorities } from "@/lib/lifeAreas";
import BucketRow from "./BucketRow";

export default function BucketEditor({ profile, onClose }) {
  const queryClient = useQueryClient();
  const [buckets, setBuckets] = useState(() => bucketSettings(profile));
  const [saving, setSaving] = useState(false);

  const patch = (key, changes) =>
    setBuckets((prev) => prev.map((b) => (b.key === key ? { ...b, ...changes } : b)));

  // The order of the list *is* the priority: top gets the most of their week.
  const move = (key, dir) =>
    setBuckets((prev) => {
      const index = prev.findIndex((b) => b.key === key);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((b, i) => ({ ...b, priority: i + 1 }));
    });

  const save = async () => {
    setSaving(true);
    const cleaned = buckets.map((b, i) => ({
      key: b.key,
      label: (b.label || "").trim(),
      emoji: b.emoji,
      hidden: b.hidden === true,
      priority: i + 1,
      includes: (b.includes || []).map((word) => word.trim()).filter(Boolean),
    }));
    await base44.entities.UserProfile.update(profile.id, {
      bucket_settings: cleaned,
      bucket_mix: mixFromPriorities(cleaned),
    });
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    setSaving(false);
    onClose();
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
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg p-6 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Your five buckets</h2>
            <p className="text-xs text-[#8A8580] mt-0.5">
              Name them how you talk about them. Whatever sits at the top gets the most of your week.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB] flex-shrink-0">
            <X className="w-4 h-4 text-[#8A8580]" />
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {buckets.map((bucket, i) => (
            <BucketRow
              key={bucket.key}
              bucket={bucket}
              rank={i + 1}
              isFirst={i === 0}
              isLast={i === buckets.length - 1}
              onChange={(changes) => patch(bucket.key, changes)}
              onMove={(dir) => move(bucket.key, dir)}
            />
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 mt-4 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#333] transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save my buckets"}
        </button>
        <p className="text-[10px] text-[#B0AAA4] mt-2 leading-snug">
          Hidden buckets stop showing on your balance, but the hours you already logged stay put.
        </p>
      </motion.div>
    </motion.div>
  );
}