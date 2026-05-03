"use client";
import { useDebate } from "@/store/debate";
import { useDebateAPI } from "@/hooks/useDebateAPI";
import { IdeaInput } from "@/components/IdeaInput";
import { AgentCard } from "@/components/AgentCard";
import { RebuttalInput } from "@/components/RebuttalInput";
import { ResilienceReport } from "@/components/ResilienceReport";
import { RoundSkeletons } from "@/components/AgentSkeleton";

export default function Home() {
  const { rounds, status, report, sessionId, currentRound, reset } = useDebate();
  const { startDebate, submitRebuttal, generateReport } = useDebateAPI();
  const MAX_ROUNDS = 3;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">

      {/* Initial idea input */}
      {status === "idle" && (
        <IdeaInput onSubmit={startDebate} loading={false} />
      )}

      {/* Show rounds */}
      {rounds.map((round, ri) => (
        <div
          key={ri}
          className={ri > 0 ? "mt-8 pt-8" : "mt-10"}
          style={ri > 0 ? { borderTop: "0.5px solid rgba(255,255,255,0.06)" } : {}}
        >
          <div
            className="text-xs tracking-widest uppercase mb-4"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {ri === 0 ? "Round 1 — opening attacks" : `Round ${ri + 1} — escalation`}
          </div>
          {round.responses.map((r, i) => (
            <AgentCard key={r.agent} agent={r.agent} content={r.content} index={i} />
          ))}
          {round.rebuttal && (
            <div
              className="mt-3 p-4 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderLeft: "3px solid rgba(255,255,255,0.15)",
              }}
            >
              <div
                className="text-xs uppercase tracking-widest mb-2"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Your rebuttal
              </div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                {round.rebuttal}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Skeleton loading cards — shown while agents are thinking */}
      {status === "loading" && <RoundSkeletons />}

      {/* Rebuttal input */}
      {status === "awaiting_rebuttal" && sessionId && (
        <RebuttalInput
          onSubmit={(text) => {
            if (rounds.length > 0) {
              useDebate.getState().setRebuttal(rounds.length - 1, text);
            }
            submitRebuttal(sessionId, text);
          }}
          onGenerateReport={() => generateReport(sessionId)}
          loading={false}
          round={currentRound}
          maxRounds={MAX_ROUNDS}
        />
      )}

      {/* Generating report */}
      {status === "generating_report" && (
        <div
          className="mt-8 text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Generating your resilience report…
        </div>
      )}

      {/* Report */}
      {status === "complete" && report && (
        <ResilienceReport data={report} />
      )}

      {/* Reset */}
      {(status === "complete" || rounds.length > 0) && (
        <button
          onClick={reset}
          className="mt-10 w-full py-3 text-xs tracking-widest uppercase rounded"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
          }}
        >
          ← Test another idea
        </button>
      )}
    </main>
  );
}