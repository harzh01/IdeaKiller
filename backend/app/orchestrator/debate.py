import asyncio
from app.core.ollama_client import chat
from app.agents.prompts import (
    REALIST_PROMPT, LOGICIAN_PROMPT,
    MIRROR_PROMPT, STEELMAN_PROMPT
)
from app.models.debate import AgentKey, AgentResponse, DebateSession, RoundHistory
from app.rag.retriever import retrieve_context

AGENTS = [
    (AgentKey.REALIST,  REALIST_PROMPT),
    (AgentKey.LOGICIAN, LOGICIAN_PROMPT),
    (AgentKey.MIRROR,   MIRROR_PROMPT),
    (AgentKey.STEELMAN, STEELMAN_PROMPT),
]

RAG_BLOCK = """

--- EVIDENCE FROM YOUR KNOWLEDGE BASE ---
Use this evidence to make your attacks specific and credible.
Cite real numbers and findings where relevant.

{context}
--- END EVIDENCE ---"""


def build_messages(idea, round_num, previous_rounds, rebuttal=None):
    if round_num == 1:
        return [{"role": "user", "content": "Here is my idea or decision: " + idea}]

    messages = [{"role": "user", "content": "Original idea: " + idea}]
    for prev in previous_rounds:
        summaries = "\n\n".join([
            r.agent.upper() + ": " + r.content
            for r in prev.responses
        ])
        messages.append({"role": "assistant", "content": summaries})
        if prev.rebuttal:
            messages.append({
                "role": "user",
                "content": "My response: " + prev.rebuttal + "\n\nEscalate. Go deeper on what I have not addressed."
            })
    if rebuttal and round_num > 1:
        messages.append({
            "role": "user",
            "content": "My rebuttal: " + rebuttal + "\n\nEscalate your attack."
        })
    return messages


async def call_single_agent(agent_key, system_prompt, messages, round_num, idea):
    try:
        enriched_prompt = system_prompt

        if agent_key != AgentKey.STEELMAN:
            context = retrieve_context(agent_key.value, idea)
            if context:
                enriched_prompt += RAG_BLOCK.format(context=context)

        content = await chat(
            system_prompt=enriched_prompt,
            messages=messages,
            max_tokens=400
        )
        return AgentResponse(agent=agent_key, content=content, round=round_num)

    except Exception as e:
        return AgentResponse(
            agent=agent_key,
            content="[Agent temporarily unavailable: " + str(e) + "]",
            round=round_num
        )


async def run_debate_round(session, rebuttal=None):
    session.current_round += 1
    round_num = session.current_round

    messages = build_messages(
        idea=session.idea,
        round_num=round_num,
        previous_rounds=session.rounds,
        rebuttal=rebuttal
    )

    tasks = [
        call_single_agent(key, prompt, messages, round_num, session.idea)
        for key, prompt in AGENTS
    ]
    responses = await asyncio.gather(*tasks)

    session.rounds.append(
        RoundHistory(round=round_num, responses=list(responses))
    )
    for r in responses:
        session.all_responses.setdefault(r.agent, []).append(r.content)

    return list(responses)