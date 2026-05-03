"use client";
import { useState } from "react";

interface Props {
  onSubmit: (text: string) => void;
  onGenerateReport: () => void;
  loading: boolean;
  round: number;
  maxRounds: number;
}

export function RebuttalInput({ onSubmit, onGenerateReport, loading, round, maxRounds }: Props) {
  const [text, setText] = useState("");

  return (
    <div className="mt-8 pt-6" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
      <div className="mb-3 text-xs tracking-widest uppercase"
           style={{ color: "rgba(255,255,255,0.3)" }}>
        Your rebuttal — defend yourself, add context, or concede
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Respond to the agents' challenges…"
        rows={3}
        className="w-full rounded-md p-4 text-sm resize-none outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#e8e6e1",
          lineHeight: 1.6,
        }}
      />
      <div className="flex justify-end gap-3 mt-3">
        <button
          onClick={onGenerateReport}
          className="px-4 py-2 text-xs rounded cursor-pointer"
          style={{
            background: "rgba(240,160,75,0.1)",
            border: "1px solid rgba(240,160,75,0.3)",
            color: "#f0a04b",
          }}
        >
          Generate report →
        </button>
        {round < maxRounds && (
          <button
            onClick={() => { onSubmit(text); setText(""); }}
            disabled={loading || text.trim().length < 5}
            className="px-4 py-2 text-xs rounded cursor-pointer"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
              opacity: text.trim().length < 5 ? 0.4 : 1,
            }}
          >
            {loading ? "Agents thinking…" : "Submit rebuttal →"}
          </button>
        )}
      </div>
    </div>
  );
}