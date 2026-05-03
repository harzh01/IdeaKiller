"use client";
import { motion } from "framer-motion";
import type { AgentKey } from "@/store/debate";

const CONFIG: Record<AgentKey, { label: string; color: string; role: string }> = {
  realist:  { label: "The Realist",  color: "#D85A30", role: "External world" },
  logician: { label: "The Logician", color: "#7F77DD", role: "Logic & reasoning" },
  mirror:   { label: "The Mirror",   color: "#D4537E", role: "Self-knowledge" },
  steelman: { label: "The Steelman", color: "#1D9E75", role: "Best case" },
};

interface Props {
  agent: AgentKey;
  content: string;
  index: number; // for stagger delay
}

export function AgentCard({ agent, content, index }: Props) {
  const cfg = CONFIG[agent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.2, duration: 0.35, ease: "easeOut" }}
      className="rounded-lg mb-3 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderLeft: `3px solid ${cfg.color}`,
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: cfg.color }}
        />
        <span className="text-xs font-medium" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.3)" }}>
          {cfg.role}
        </span>
      </div>
      <div className="px-4 py-4 text-sm leading-relaxed"
           style={{ color: "rgba(255,255,255,0.7)" }}>
        {content}
      </div>
    </motion.div>
  );
}