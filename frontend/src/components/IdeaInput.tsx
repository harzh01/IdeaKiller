"use client";
import { useState } from "react";
import { motion } from "framer-motion";

const EXAMPLES = [
  "I want to quit my job and travel for 6 months",
  "I should cut off a friend who drains me",
  "I want to drop out and learn online instead",
  "I think I should move back to my hometown",
];

interface Props {
  onSubmit: (idea: string) => void;
  loading: boolean;
}

export function IdeaInput({ onSubmit, loading }: Props) {
  const [idea, setIdea] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="mb-12">
        <p className="text-xs tracking-widest mb-5" style={{ color: "#D85A30" }}>
          IDEAKILLER
        </p>
        <h1 className="text-5xl mb-4 leading-tight" style={{
          fontFamily: "Georgia, serif", fontWeight: 400
        }}>
          Your idea vs.<br />
          <em style={{ color: "#D85A30" }}>three adversaries.</em>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Not a coach. Not a journal. An adversary that finds every hole you missed.
        </p>
      </header>

      <div className="mb-3" style={{ color: "rgba(255,255,255,0.4)", fontSize: 11,
        letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Your idea or decision
      </div>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="I want to quit my job and go freelance next month…"
        rows={3}
        className="w-full rounded-md p-5 text-lg resize-none outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#e8e6e1",
          fontFamily: "Georgia, serif",
          lineHeight: 1.6,
        }}
        onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
        onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
      />

      <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setIdea(ex)}
              className="text-xs px-3 py-1 rounded cursor-pointer transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = "rgba(255,255,255,0.4)";
              }}
            >
              {ex.slice(0, 28)}…
            </button>
          ))}
        </div>
        <button
          onClick={() => idea.trim().length > 10 && onSubmit(idea)}
          disabled={loading || idea.trim().length < 10}
          className="px-5 py-2 rounded text-sm font-medium cursor-pointer transition-all"
          style={{
            background: loading ? "rgba(216,90,48,0.4)" : "#D85A30",
            color: "#fff",
            border: "none",
            opacity: idea.trim().length < 10 ? 0.4 : 1,
          }}
        >
          {loading ? "Agents thinking…" : "Attack this idea →"}
        </button>
      </div>
    </motion.div>
  );
}