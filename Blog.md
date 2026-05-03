# I Built an AI That Argues Against You — Here's Everything I Learned

*A deep dive into building IdeaKiller: a multi-agent adversarial debate system with RAG, SSE streaming, Redis session management, and MCP integration.*

---

## The Problem With Every AI Tool I've Used

Every AI tool I had ever used before building this had the same fundamental design: it was trying to help me. I asked, it answered. I explained my plan, it validated it. I pitched an idea, it found the good parts and gently suggested improvements.

That's a reasonable product to build. Helpful AI is useful AI. But I kept noticing a gap — the gap between having an idea and having stress-tested one.

When you're about to make a big decision — quit your job, move cities, end a relationship, start a business, go back to school — the last thing you need is something that helps you feel good about it. What you need is something that finds every hole you missed. Something that asks the question your supportive friends won't. Something that points out that your plan requires three things to simultaneously be true that probably won't be.

Nobody had built that. So I built it.

IdeaKiller is an adversarial multi-agent debate system. You describe an idea or decision. Three AI agents attack it from different angles, backed by evidence from curated knowledge bases. You argue back. They escalate. After up to three rounds, a scored resilience report tells you exactly what held up under pressure and what didn't.

This post is a comprehensive walkthrough of how I built it — every architectural decision, every technology choice, every lesson learned.

---

## The Concept: Why Adversarial AI

The idea behind IdeaKiller is grounded in something well-established in both philosophy and organizational psychology: structured adversarial critique produces better decisions than unchallenged consensus.

In philosophy this is called the dialectic method — thesis meets antithesis, producing synthesis. In military strategy it's called red-teaming — a dedicated group tasked with finding weaknesses in your plan. In law it's the adversarial system — the assumption that truth emerges more reliably from two sides arguing than from one side explaining.

The common thread: you think more clearly when you have to defend your ideas against someone who genuinely disagrees.

The problem is that getting high-quality adversarial critique from humans is expensive, uncomfortable, and rare. Friends are polite. Colleagues have interests. Hiring a devil's advocate is not a normal thing people do. And even well-intentioned critics tend to attack the weakest surface of an idea rather than the most structurally important one.

An AI adversary solves all of this. It has no social stakes. It can attack any dimension simultaneously. It can be deployed at 2am before a decision that needs to be made at 9am. And most importantly, it can be designed to attack specific, meaningful dimensions rather than whatever happens to be most obviously wrong.

That last point is the key design insight behind IdeaKiller. The three adversarial agents don't just "criticize" — each attacks a specific, well-defined layer of a decision:

The **Realist** attacks your model of the world. What you think will happen externally. The Realist has read the base rates, the failure statistics, the research on how systems actually work. It knows that 62% of new freelancers report income instability in their first year. It knows that cold LinkedIn outreach converts at 2-3%. It is going to make you defend your timeline, your assumptions about other people's behavior, and your understanding of how the relevant systems actually operate.

The **Logician** attacks your internal reasoning. Not whether your facts are right, but whether your thinking is coherent. The Logician looks for cognitive biases — planning fallacy, optimism bias, sunk cost, present bias. It looks for logical contradictions: two things you believe that can't simultaneously be true. It looks for means-ends confusion: whether you're solving the right problem or just the most obvious one.

The **Mirror** attacks your model of yourself. This is the most uncomfortable agent and the most valuable. It questions whether your track record supports your stated intentions. It identifies when a decision is being driven by identity rather than reason. It points to the gap between who you think you are and what your past behavior actually shows. It's the agent that asks "you've said you were going to do this three times before — what's actually different this time?"

The **Steelman** is the fourth agent, and it runs not as an attacker but as a calibrator. It builds the strongest possible case for your idea — not to validate you, but to show you what your argument looks like when it's airtight. The gap between your actual pitch and the steelman version is your improvement target.

---

## Architecture Overview

Before diving into each component, here's the full system:

```
User (Browser)
    │
    │  HTTP + Server-Sent Events
    ▼
Next.js Frontend (Port 3000)
    │  Zustand state store
    │  SSE stream reader
    │  Framer Motion animations
    │
    │  REST API calls
    ▼
FastAPI Backend (Port 8000)
    │
    ├── /debate/start  ──────────────────────────────────────┐
    │                                                        │
    │   asyncio.gather (parallel execution)                  │
    │   ┌────────────┬────────────┬────────────┬──────────┐ │
    │   │  Realist   │  Logician  │   Mirror   │Steelman  │ │
    │   │            │            │            │          │ │
    │   │  ChromaDB  │  ChromaDB  │  ChromaDB  │  (none)  │ │
    │   │ realist_kb │logician_kb │  mirror_kb │          │ │
    │   └─────┬──────┴──────┬─────┴──────┬─────┴────┬─────┘ │
    │         │             │            │          │        │
    │         └─────────────┴────────────┴──────────┘        │
    │                         │                              │
    │                   Groq API                             │
    │              (llama-3.1-8b-instant)                   │
    │                                                        │
    │   Session saved to Redis ◄──────────────────────────── ┘
    │
    ├── /debate/{id}/rebuttal  (same flow, escalated prompts)
    │
    └── /report/{id}/generate  (Groq, structured JSON output)

FastMCP Server (Port 8001)
    │  MCP Protocol
    ▼
Claude Desktop
    stress_test_idea()
    submit_rebuttal()
    generate_report()
```

The system has four layers: the frontend handles UI and streaming, the backend orchestrates agents, the RAG layer enriches each agent with relevant knowledge, and the MCP layer exposes the whole engine as a callable tool.

---

## Technology Stack — Every Choice Explained

### Frontend: Next.js 14 with App Router

I chose Next.js 14 specifically for the App Router, not just because it's the current standard. The App Router gives server components, which means the initial page load can be rendered server-side without JavaScript for the skeleton structure — only the interactive debate components need to hydrate client-side. This matters for perceived performance.

More importantly, Next.js handles the API proxy cleanly. API keys live in environment variables on the server side. The client never sees them. For a project that will be deployed and demonstrated publicly, this is important.

I considered Vite with React, but the App Router's streaming primitives align naturally with the SSE-based architecture of the debate engine.

### TypeScript Throughout

The debate state is complex — sessions have rounds, rounds have agent responses, responses have typed agent keys, the store has multiple status states. Without TypeScript, managing this state across components without runtime errors would require constant manual checking. TypeScript catches the mismatch between what an API returns and what a component expects at compile time rather than at demo time.

The specific win: the `AgentKey` enum (`"realist" | "logician" | "mirror" | "steelman"`) is defined once in the Zustand store and used everywhere. When I add a new agent, TypeScript tells me every place that needs to handle it.

### Zustand for State Management

The debate session state — current round, all agent responses, session ID, status, final report — needs to be accessible from multiple components without prop drilling. React Context re-renders everything on every change. Redux is verbose for this scale. Zustand hits the right balance: a typed store, minimal boilerplate, and a `getState()` method that lets you read state from outside React components (useful in the SSE hook).

```typescript
// The entire debate state in one typed store
interface DebateStore {
  sessionId: string | null;
  idea: string;
  rounds: Round[];
  currentRound: number;
  status: "idle" | "loading" | "awaiting_rebuttal" | "generating_report" | "complete";
  report: Record<string, unknown> | null;
  // ... actions
}
```

### Framer Motion for Animations

The staggered appearance of agent cards is not decorative — it's functional. When four cards appear simultaneously, the user's eye doesn't know where to go. Staggered entrances (150ms between each card) direct attention sequentially: Realist first, then Logician, then Mirror, then Steelman. The user reads them in the intended order.

Framer Motion handles the animation with a `delay` prop on each card's `motion.div`. The skeleton loading cards use the same animation system — they animate in before the content arrives, so the page never feels empty.

### FastAPI for the Backend

FastAPI is the right Python web framework for this use case for three reasons.

First, it's async-first. All the LLM calls are I/O-bound operations that benefit from async execution. FastAPI's native `async def` route handlers mean the server doesn't block while waiting for Groq to respond.

Second, it integrates naturally with Pydantic for request and response validation. Every agent response, every session model, every API request body is a typed Pydantic model. When the LLM returns malformed JSON for the report, the error is caught at the Pydantic validation layer with a clear message, not as a runtime `KeyError` somewhere deep in the code.

Third, it generates OpenAPI documentation automatically at `/docs`. During development, this interactive documentation is how I tested every endpoint before the frontend was built.

### The Orchestrator: asyncio.gather

This is the most important engineering decision in the project, and it's worth explaining in detail.

The naive implementation of a multi-agent system calls agents sequentially:

```python
# WRONG — sequential, takes 4x as long
realist_response = await call_agent(REALIST_PROMPT, messages)
logician_response = await call_agent(LOGICIAN_PROMPT, messages)
mirror_response = await call_agent(MIRROR_PROMPT, messages)
steelman_response = await call_agent(STEELMAN_PROMPT, messages)
```

With Groq, each call takes 1-3 seconds. Sequential execution means 4-12 seconds of total wait time. Worse, the user has no feedback during that time — the page just sits there.

The correct implementation uses `asyncio.gather`:

```python
# CORRECT — parallel, takes as long as the slowest single call
tasks = [
    call_single_agent(key, prompt, messages, round_num, idea)
    for key, prompt in AGENTS
]
responses = await asyncio.gather(*tasks)
```

`asyncio.gather` creates all four coroutines and runs them concurrently on the event loop. Since the operations are I/O-bound (waiting for HTTP responses from Groq), they interleave efficiently. The total wait time is approximately the time of the single slowest call — not the sum of all four.

This is the difference between 2 seconds and 8 seconds. In a debate application where the user is waiting for agents to respond, this is the difference between an engaging experience and an abandoned one.

I chose not to use LangChain or any agent framework for this orchestration. The reasons are practical:

When something goes wrong in a LangChain AgentExecutor, the error is three layers deep in framework code that you don't control. When something goes wrong in `asyncio.gather`, the traceback points directly to your code. For a project where I needed to understand every component well enough to explain it in an interview, framework opacity was a liability.

The orchestrator is 80 lines of code. I can read the entire thing in two minutes. That matters when you're debugging at 11pm before a demo.

### Groq API with llama-3.1-8b-instant

I initially planned to use Ollama for local model inference. The appeal was obvious — no API costs, full control, no latency from network calls. The problem was my development machine: 7.7GB of RAM with Windows consuming 90% of it, leaving under 1GB free for model inference. Even llama3.2:3b (2GB model) couldn't load reliably.

Groq solved this entirely. The Groq free tier gives 6,000 requests per day on llama-3.1-8b-instant — a genuinely capable model that responds in 1-3 seconds. For context, local inference on the 3b model was taking 45-60 seconds per call. Groq is faster than local inference despite going over the network, because their hardware is specialized for exactly this workload.

The client is a thin wrapper:

```python
async def chat(system_prompt: str, messages: list, max_tokens: int = 400) -> str:
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "system", "content": system_prompt}, *messages],
        max_tokens=max_tokens,
        temperature=0.8,
    )
    return response.choices[0].message.content.strip()
```

The `temperature=0.8` is deliberate. Lower temperatures produce more predictable outputs — useful for the report generator where I want structured JSON. Higher temperatures produce more creative and varied attacks — useful for the adversarial agents where repetitive phrasing would feel mechanical. A single temperature value would be a compromise; ideally the agents use 0.8 and the report uses 0.3. This is a known improvement area.

The retry logic handles Groq's rate limiting:

```python
for attempt in range(retries):
    try:
        return await _make_call(...)
    except RateLimitError:
        if attempt < retries - 1:
            await asyncio.sleep(2 ** attempt)  # exponential backoff
        else:
            raise
```

Exponential backoff (1s, 2s, 4s) is the standard approach for rate limit handling. Fixed delays either wait too long on short limits or not long enough on long ones.

### Server-Sent Events for Streaming

This is a decision I thought carefully about. The alternatives were WebSockets or HTTP polling.

WebSockets provide bidirectional real-time communication — ideal when the client needs to push data continuously. But in the IdeaKiller flow, after the initial POST request to start a debate, all subsequent data flows in one direction: server to client. The client pushes data only when submitting a rebuttal (a separate POST request). WebSockets would add connection upgrade overhead, state management complexity, and infrastructure requirements for something that only needs one-directional streaming.

HTTP polling would have the client request new data every N seconds. This is simple to implement but inefficient — most polls return nothing, and the latency between a response arriving and the client seeing it equals the poll interval.

SSE is exactly right here. It's a simple protocol: the server sends `data: {...}\n\n` formatted strings over a persistent HTTP connection. The browser's `EventSource` API handles reconnection automatically. No special infrastructure required. Works through standard HTTP/1.1.

The implementation in FastAPI:

```python
async def event_stream():
    yield format_sse({"event": "session_created", "session_id": session.session_id})

    responses = await run_debate_round(session)

    for i, response in enumerate(responses):
        await asyncio.sleep(i * 0.3)  # 300ms stagger for visual effect
        yield format_sse({
            "event": "agent_response",
            "agent": response.agent,
            "content": response.content,
            "round": response.round
        })

    yield format_sse({"event": "round_complete", "round": session.current_round})

return StreamingResponse(event_stream(), media_type="text/event-stream")
```

The 300ms stagger is a product decision embedded in engineering code. All four agents finish at roughly the same time (since they run in parallel), but presenting them simultaneously loses the sequential reading order. The stagger creates the visual effect of agents arriving one after another — more engaging and easier to follow.

The SSE reader on the frontend:

```typescript
async function readSSEStream(body: ReadableStream) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";  // keep incomplete line in buffer

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(data);
        }
    }
}
```

The buffer handling is important. TCP packets don't necessarily align with SSE event boundaries. A single `reader.read()` might return half an event, or two and a half events. The buffer accumulates chunks and processes only complete lines, with the incomplete trailing line held for the next chunk.

### Redis for Session Storage

Between debate rounds — while the user is typing their rebuttal — the full debate state needs to persist somewhere. The options are: in-memory (lost if the server restarts), a database (overkill for ephemeral session data), or Redis.

Redis is the right tool for ephemeral keyed data. It's fast (sub-millisecond reads/writes), supports TTL-based expiry (sessions auto-clean after 2 hours), and the data model (key-value with JSON strings) maps naturally to serialized Pydantic models.

```python
async def save_session(session: DebateSession) -> None:
    r = await get_redis()
    await r.setex(
        f"debate:{session.session_id}",
        7200,  # 2 hour TTL
        session.model_dump_json()
    )

async def load_session(session_id: str) -> DebateSession:
    r = await get_redis()
    data = await r.get(f"debate:{session_id}")
    if not data:
        raise ValueError(f"Session not found: {session_id}")
    return DebateSession.model_validate_json(data)
```

The key pattern `debate:{session_id}` uses the session UUID as a natural primary key. The 2-hour TTL means Redis cleans up abandoned sessions automatically — no garbage collection code required.

---

## RAG: Retrieval Augmented Generation

This is the most technically interesting part of the system, and it's worth explaining from first principles.

### The Problem RAG Solves

Without RAG, when The Realist attacks your freelancing plan, it says something like: "Freelancing can be financially unstable, especially in the beginning. Have you thought about how long it might take to find clients?"

This is true and vague. It's not wrong, but it's not compelling. A person could dismiss it by saying "yeah I know, I'll figure it out."

With RAG, The Realist says: "62% of new freelancers report income instability in their first year. The average time to land a first paying client is 3-6 months — not days or weeks. Only 35% of people who say they will go freelance are still doing it two years later, with inconsistent income cited as the primary reason 58% return to employment. What does your savings runway look like at month four?"

This is harder to dismiss. It's specific, it's cited, and it's directly relevant to the specific claim being made. The agent isn't speaking from priors — it retrieved this evidence from a knowledge base specifically assembled for this purpose.

### How RAG Works

RAG has two phases: indexing and retrieval.

**Indexing** (run once, or whenever the knowledge base changes):

1. Text documents are read from files
2. Each document is split into chunks (400 characters with 50-character overlap in my implementation)
3. Each chunk is converted into a vector — a list of numbers representing its semantic meaning — using an embedding model
4. The vectors and their source text are stored in a vector database

The embedding model (`all-MiniLM-L6-v2` from sentence-transformers) converts any text into a 384-dimensional vector. Text with similar meaning produces similar vectors — "freelancing instability" and "self-employment income risk" will produce vectors that are close together in the 384-dimensional space, even though they share no words.

**Retrieval** (every agent call):

1. The user's idea is converted to a vector using the same embedding model
2. The vector database finds the chunks with the highest cosine similarity to the query vector
3. The top 3 chunks are returned and formatted as context
4. The context is injected into the agent's system prompt before the LLM call

```python
def retrieve_context(agent, query, n_results=3):
    query_embedding = model.encode([query]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas", "distances"]
    )
    parts = []
    for doc, meta, dist in zip(results["documents"][0],
                                results["metadatas"][0],
                                results["distances"][0]):
        if dist < 1.5:  # filter out low-relevance chunks
            parts.append(f"[Source: {meta['source']}]\n{doc}")
    return "\n\n".join(parts)
```

The distance threshold (`dist < 1.5`) is a relevance filter. If someone submits "I want to adopt a puppy," The Realist's freelancing statistics are not relevant. Without the filter, the agent would receive context that's semantically distant from the query and might reference it inappropriately. With the filter, if nothing is close enough, the agent falls back to its base knowledge.

### The Namespace Design Decision

The most important RAG design decision was giving each agent its own ChromaDB collection rather than one shared collection.

A shared collection would have all three knowledge bases combined. When The Realist queries for "freelancing income instability," it might retrieve chunks from the Mirror's behavioral science knowledge base about the intention-action gap. That's not wrong, but it blurs the agent's identity — The Realist suddenly sounds like a psychologist.

Separate collections ensure each agent operates within its defined domain. The Realist only ever retrieves external-world facts. The Logician only ever retrieves cognitive biases and logical fallacies. The Mirror only ever retrieves behavioral science. The attacks stay focused and the agents sound distinct.

```python
AGENT_COLLECTIONS = {
    "realist":  "./data/realist",   # failure rates, systems reality
    "logician": "./data/logician",  # cognitive biases, logical fallacies
    "mirror":   "./data/mirror",    # behavioral science research
}
```

The Steelman gets no RAG at all. This is intentional. The Steelman's job is to find the strongest case in the user's own argument — it should work from what the user said, not from external evidence. Adding a knowledge base to the Steelman would make it generate generic "reasons why freelancing is great" rather than "the strongest version of your specific argument."

### The Embedding Model Choice

`all-MiniLM-L6-v2` is a 90MB sentence transformer model. It was chosen over the alternatives for a specific reason: it's local.

Using OpenAI's embedding API would require an API key, add latency for every query, and cost money at scale. Using a larger local model would require more RAM and be slower to load. `all-MiniLM-L6-v2` runs on CPU, loads in under 5 seconds after the first download, and produces embeddings fast enough that the RAG retrieval adds less than 100ms to each agent call.

The quality tradeoff is acceptable. The model produces embeddings that are good enough for the knowledge retrieval task — finding relevant chunks about freelancing when the query is about quitting a job. It's not state-of-the-art, but it doesn't need to be.

LRU caching ensures the model and ChromaDB client are loaded once and reused:

```python
@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer("all-MiniLM-L6-v2")

@lru_cache(maxsize=1)
def get_client():
    return chromadb.PersistentClient(path=CHROMA_PATH)
```

Without this, the 90MB model would be loaded fresh on every request — completely unacceptable.

---

## The Agent Prompts: The Core IP

The system prompts are where the most design work happened. A multi-agent system is only as good as the clarity of each agent's identity and attack surface. Bad prompts produce vague, repetitive, generic attacks that feel like reading a self-help article. Good prompts produce specific, uncomfortable, evidence-backed challenges that make you actually think.

Each prompt defines: the agent's identity, its specific attack dimension, hard constraints on format and length, and a set of rules that prevent generic responses.

The key rule that appears in all three adversarial prompts: **"Do NOT say who you are. Just start attacking."**

This matters more than it sounds. If an agent starts with "As The Realist, I am here to challenge your external assumptions...", the user's brain categorizes it as a roleplay exercise and disengages. If the attack begins immediately — "62% of new freelancers report income instability..." — the user reads it as a direct challenge and engages defensively. That defensive engagement is the emotional state that produces actual reflection.

The 120-word limit is also deliberate. Longer responses dilute the attack. A 300-word critique gives the user too many things to respond to, and they can dismiss the weakest points while ignoring the strongest ones. A tight 120-word attack contains 2-3 focused challenges that each require a real answer.

The escalation instruction in rounds 2 and 3 is the mechanism that makes the debate feel like an actual debate rather than a series of unrelated challenges:

```python
"Escalate. Go deeper on what I have not addressed. "
"If I handled your last challenge well, find a new angle."
```

This tells the agent to read the full conversation history and distinguish between things the user rebutted adequately and things they ignored or deflected. It produces the feeling of an opponent who is paying attention — the most important quality of a useful adversary.

---

## MCP: Model Context Protocol

### What MCP Actually Is

MCP is a standardization layer for AI tool use. Before MCP, every AI system that wanted to call external tools had to define its own tool use API — different formats, different authentication patterns, different error handling conventions. MCP defines a common protocol so any MCP-compatible tool can plug into any MCP-compatible AI client.

The analogy that works best: USB. Before USB, every peripheral had a different connector. After USB, any device could plug into any computer. MCP does the same for AI tools.

### Why It Matters for This Project

Without MCP, IdeaKiller is a website. Users have to find it, open it, and use it in a browser. With MCP, IdeaKiller's debate engine is available inside Claude Desktop. A user working in Claude doesn't need to switch contexts — they can say "stress test this idea" and the debate happens in their existing conversation.

This transforms the project from a standalone application into infrastructure that other tools can use. That's a qualitatively different thing.

### The Implementation

FastMCP makes implementing MCP servers almost trivially simple. You decorate existing Python functions and they become MCP tools:

```python
mcp = FastMCP("IdeaKiller")

@mcp.tool()
async def stress_test_idea(idea: str) -> dict:
    """
    Stress-test any idea or life decision with three adversarial AI agents.
    Use this when the user wants to think through a big decision...
    """
    session = DebateSession(session_id=str(uuid.uuid4()), idea=idea)
    responses = await run_debate_round(session)
    await save_session(session)
    # ... format and return
```

The docstring is not documentation — it's functional. Claude reads the tool description to decide when to call it. A vague description ("processes ideas") means Claude won't know when to use the tool. A specific description ("use this when the user wants to think through a big decision, find weaknesses in a plan, get honest pushback...") means Claude calls it at exactly the right moments.

The three exposed tools map to the three phases of a debate session: start, continue, conclude. Claude can orchestrate a full debate session autonomously — calling `stress_test_idea`, showing the responses, asking the user for a rebuttal, calling `submit_rebuttal`, and finally calling `generate_report` — with no additional code from the IdeaKiller side.

### The MCP + RAG Interaction

One interesting emergent property: when IdeaKiller runs through MCP, the RAG pipeline still executes. The ChromaDB retrieval happens inside `run_debate_round`, which is called by `stress_test_idea`, which is called by Claude Desktop. The entire stack runs — embedding model, vector search, context injection, Groq API call — all triggered by a user's message in Claude Desktop.

This means Claude Desktop users get the same evidence-backed attacks as web app users. The MCP layer is a thin exposure of the exact same underlying system, not a simplified version of it.

---

## The Resilience Report: Structured Output from an LLM

The report generation is an interesting engineering challenge. I need a structured JSON object from an LLM that will reliably parse into a Pydantic model. LLMs don't always produce valid JSON — they add explanatory text, wrap in markdown code fences, or occasionally produce subtly malformed JSON.

The approach: a highly constrained system prompt that instructs the model to produce only JSON, followed by defensive parsing that strips common formatting artifacts:

```python
raw = await chat(system_prompt=REPORT_PROMPT, messages=[...], max_tokens=700)

clean = raw.strip()
if clean.startswith("```"):
    lines = clean.split("\n")
    clean = "\n".join(lines[1:-1])  # strip ``` fences

try:
    report = json.loads(clean)
    return ResilienceReport(**report)
except Exception as e:
    return {"error": f"Report parsing failed: {str(e)}", "raw_response": raw}
```

The fallback returns the raw response alongside the error, which is useful for debugging — you can see exactly what the model produced and why it failed to parse.

The scoring rubric in the prompt is explicitly calibrated to prevent score clustering around 5. Without explicit guidance, LLMs tend toward moderate scores — 5s and 6s — because they're trained on human feedback that rewards balance. The rubric says: "3-4 means serious unresolved problems. 7-8 means well-defended. Be honest. Do not cluster scores around 5." This produces more meaningful differentiation.

---

## What I Would Do Differently

**Separate temperature settings per agent.** I use `temperature=0.8` everywhere. The adversarial agents benefit from higher temperature (more creative, less repetitive attacks). The report generator would benefit from lower temperature (more consistent, predictable JSON output). A split would improve both.

**Background task for report generation.** Currently the report endpoint blocks until generation completes — 3-5 seconds. A better pattern would be to kick off a background task and return immediately with a `job_id`, then have the frontend poll `/report/{job_id}/status`. This prevents timeout issues and gives better user feedback.

**RAG with re-ranking.** The current retrieval returns the top-3 chunks by cosine similarity. A two-stage retrieval — broader first-pass retrieval followed by a re-ranking model that scores chunks by relevance to the specific query — would produce better context selection. The `cross-encoder/ms-marco-MiniLM-L-6-v2` model is a standard choice for this.

**Streaming agent responses token by token.** Currently agents stream in as complete responses (one SSE event per agent). True token-by-token streaming would make responses feel more alive — like watching someone type. Groq supports streaming responses; wiring it through to the frontend SSE channel is the missing piece.

**Evaluation harness.** I have no automated tests on the agent response quality. A proper eval suite would have 20-30 test ideas with rubrics for expected attack dimensions and run before every deployment. This is what "testing your AI system" actually means in practice.

---

## What I Learned

**Agent frameworks add abstraction you pay for when things break.** I built the orchestrator in 80 lines of Python using `asyncio.gather`. I understand every line. When it fails, the traceback is in my code. If I had used LangChain's AgentExecutor, I would have saved 30 minutes writing the orchestrator and spent several hours debugging framework internals when something went wrong.

**RAG namespace design is a first-class decision.** The choice to give each agent its own ChromaDB collection wasn't obvious from the start. I initially built a shared collection and noticed that agents were citing psychology research when making market arguments and vice versa. The separation was a structural fix that made each agent's identity sharper.

**MCP is not hard to implement, it's hard to design.** The FastMCP decorators took an afternoon. What took longer was designing the tool signatures and descriptions so Claude would know exactly when to call each tool and what to expect in return. Tool design is API design — the same principles apply.

**Prompts are architecture.** I spent more time on the agent system prompts than on any single piece of code. The constraint of 120 words per attack, the "do not introduce yourself" rule, the specific diagnostic questions at the end of each Mirror attack — these are design decisions with measurable impact on the quality of output. Treating prompt engineering as a first-class engineering discipline rather than "just writing instructions" produces qualitatively better systems.

**SSE is underrated.** Most tutorials reach for WebSockets the moment "real-time" is mentioned. For unidirectional streaming use cases, SSE is simpler, requires no infrastructure changes, and works through HTTP proxies and load balancers that WebSocket upgrades sometimes don't. I'll default to SSE for any future one-directional streaming requirement.

---

## Conclusion

IdeaKiller is the most technically complete project I've built. It's also the one I'm most proud of conceptually — not because the technology is impressive (though I think the architecture is solid), but because it does something genuinely useful that no existing tool does well.

Every component was chosen for a reason. The parallel agent architecture because sequential execution was too slow. RAG with namespaced collections because shared retrieval blurred agent identities. SSE over WebSockets because the communication is one-directional. Redis over a database because session data is ephemeral. MCP because the best products expose themselves as infrastructure.

The system's hardest problem turned out not to be technical. It was the prompt engineering — getting agents to attack specifically, credibly, and uncomfortably without being generic or cruel. That's a design problem that no framework solves.

If you're building your own multi-agent system, the most important thing I can pass on: write the orchestrator yourself. You'll understand every piece, debug faster, and be able to explain it clearly to anyone who asks how it works. In an interview or a code review, "I use `asyncio.gather` to fire four agent calls in parallel and stream the results over SSE" is worth ten times more than "I used LangChain."

The code is on GitHub. Go break your ideas on it.

---

*Built with FastAPI, Next.js, Groq, ChromaDB, Redis, sentence-transformers, Framer Motion, Zustand, and FastMCP.*