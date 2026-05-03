"use client";
import { motion } from "framer-motion";

function AgentSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.3 }}
      className="rounded-lg mb-3 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: "rgba(255,255,255,0.2)", flexShrink: 0 }}
        />
        <div
          className="h-3 w-28 rounded animate-pulse"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />
        <div
          className="h-3 w-16 rounded animate-pulse ml-auto"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
      </div>
      <div className="px-4 py-4 space-y-2">
        {[85, 70, 90, 60].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded animate-pulse"
            style={{
              background: "rgba(255,255,255,0.07)",
              width: w + "%",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function RoundSkeletons() {
  return (
    <div className="mt-8">
      <div
        className="h-3 w-44 rounded animate-pulse mb-5"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      {[0, 1, 2, 3].map((i) => (
        <AgentSkeleton key={i} index={i} />
      ))}
    </div>
  );
}