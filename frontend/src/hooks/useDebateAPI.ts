import { useDebate, AgentResponse } from "@/store/debate";

const API = process.env.NEXT_PUBLIC_API_URL;

export function useDebateAPI() {
  const {
    setSessionId, addAgentResponse, incrementRound,
    setStatus, setReport, setIdea
  } = useDebate();

  async function startDebate(idea: string) {
    setIdea(idea);
    setStatus("loading");

    // Open SSE stream to backend
    const response = await fetch(`${API}/debate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea }),
    });

    if (!response.body) throw new Error("No response body");
    await readSSEStream(response.body);
  }

  async function submitRebuttal(sessionId: string, rebuttal: string) {
    setStatus("loading");

    const response = await fetch(`${API}/debate/${sessionId}/rebuttal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rebuttal }),
    });

    if (!response.body) throw new Error("No response body");
    await readSSEStream(response.body);
  }

  async function generateReport(sessionId: string) {
    setStatus("generating_report");

    const response = await fetch(`${API}/report/${sessionId}/generate`, {
      method: "POST",
    });

    const data = await response.json();
    setReport(data);
  }

  // Reads the SSE stream and dispatches events to the store
  async function readSSEStream(body: ReadableStream) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          handleSSEEvent(data);
        } catch {
          // Skip malformed events
        }
      }
    }
  }

  function handleSSEEvent(data: Record<string, unknown>) {
    switch (data.event) {
      case "session_created":
        setSessionId(data.session_id as string);
        break;
      case "agent_response":
        addAgentResponse(data as unknown as AgentResponse);
        break;
      case "round_complete":
        incrementRound();
        setStatus("awaiting_rebuttal");
        break;
    }
  }

  return { startDebate, submitRebuttal, generateReport };
}
