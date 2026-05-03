import { create } from "zustand";

export type AgentKey = "realist" | "logician" | "mirror" | "steelman";

export interface AgentResponse {
  agent: AgentKey;
  content: string;
  round: number;
}

export interface Round {
  responses: AgentResponse[];
  rebuttal?: string;
}

interface DebateStore {
  // State
  sessionId: string | null;
  idea: string;
  rounds: Round[];
  currentRound: number;
  status: "idle" | "loading" | "awaiting_rebuttal" | "generating_report" | "complete";
  report: Record<string, unknown> | null;

  // Actions
  setIdea: (idea: string) => void;
  setSessionId: (id: string) => void;
  addAgentResponse: (r: AgentResponse) => void;
  setRebuttal: (roundIndex: number, text: string) => void;
  incrementRound: () => void;
  setStatus: (s: DebateStore["status"]) => void;
  setReport: (r: Record<string, unknown>) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null, idea: "", rounds: [],
  currentRound: 0, status: "idle" as const, report: null,
};

export const useDebate = create<DebateStore>((set) => ({
  ...initialState,

  setIdea: (idea) => set({ idea }),
  setSessionId: (sessionId) => set({ sessionId }),

  addAgentResponse: (r) =>
    set((state) => {
      const rounds = [...state.rounds];
      const idx = r.round - 1;
      if (!rounds[idx]) rounds[idx] = { responses: [] };
      rounds[idx] = {
        ...rounds[idx],
        responses: [...rounds[idx].responses, r],
      };
      return { rounds };
    }),

  setRebuttal: (roundIndex, text) =>
    set((state) => {
      const rounds = [...state.rounds];
      if (rounds[roundIndex]) rounds[roundIndex] = { ...rounds[roundIndex], rebuttal: text };
      return { rounds };
    }),

  incrementRound: () =>
    set((state) => ({ currentRound: state.currentRound + 1 })),

  setStatus: (status) => set({ status }),
  setReport: (report) => set({ report, status: "complete" }),
  reset: () => set(initialState),
}))