"use client";
import { motion } from "framer-motion";

interface Props { data: Record<string, unknown>; }

function Score({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? "#1D9E75" : value >= 5 ? "#f0a04b" : "#D85A30";
  return (
    <div className="text-center p-4 rounded-lg"
         style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
      <div className="text-3xl font-light mb-1" style={{ color, fontFamily: "Georgia, serif" }}>
        {Number(value).toFixed(1)}
      </div>
      <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </div>
    </div>
  );
}

export function ResilienceReport({ data }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="mt-10 pt-8" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
      <div className="text-xs tracking-widest uppercase mb-6"
           style={{ color: "rgba(255,255,255,0.3)" }}>Resilience report</div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Score label="Realism" value={data.realist_score as number} />
        <Score label="Logic" value={data.logician_score as number} />
        <Score label="Self-knowledge" value={data.mirror_score as number} />
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg"
             style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
          <div className="text-xs uppercase tracking-widest mb-2"
               style={{ color: "rgba(255,255,255,0.3)" }}>Open weaknesses</div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            {data.open_weaknesses as string}
          </p>
        </div>
        <div className="p-4 rounded-lg"
             style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
          <div className="text-xs uppercase tracking-widest mb-2"
               style={{ color: "rgba(255,255,255,0.3)" }}>Defended well</div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            {data.defended_well as string}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-lg"
               style={{ background:"rgba(255,255,255,0.03)", borderLeft: "3px solid rgba(255,255,255,0.15)" }}>
            <div className="text-xs uppercase tracking-widest mb-2"
                 style={{ color: "rgba(255,255,255,0.3)" }}>Before</div>
            <p className="text-sm italic leading-relaxed"
               style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Georgia, serif" }}>
              "{data.original_pitch as string}"
            </p>
          </div>
          <div className="p-4 rounded-lg"
               style={{ background:"rgba(255,255,255,0.03)", borderLeft: "3px solid #1D9E75" }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#1D9E75" }}>
              After debate
            </div>
            <p className="text-sm italic leading-relaxed"
               style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Georgia, serif" }}>
              "{data.refined_pitch as string}"
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}