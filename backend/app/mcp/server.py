import sys
import os
import uuid
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastmcp import FastMCP
from app.models.debate import DebateSession
from app.orchestrator.debate import run_debate_round
from app.core.redis_client import save_session, load_session
from app.core.ollama_client import chat
from app.agents.prompts import REPORT_PROMPT

mcp = FastMCP("IdeaKiller")


@mcp.tool()
async def stress_test_idea(idea: str) -> dict:
    """
    Stress-test any idea or life decision with three adversarial AI agents.

    Use this when the user wants to think through a big decision, find weaknesses
    in a plan, get honest pushback on something they are considering, or stress-test
    a business idea, career move, relationship decision, or any life choice.

    Args:
        idea: The idea or decision to stress-test. Should be specific.
              Example: I want to quit my job and go freelance next month

    Returns:
        Dictionary with agent responses and a session_id for follow-up rebuttals.
    """
    session = DebateSession(
        session_id=str(uuid.uuid4()),
        idea=idea
    )
    responses = await run_debate_round(session)
    await save_session(session)

    result = {
        "session_id": session.session_id,
        "idea": idea,
        "round": 1,
        "realist": "",
        "logician": "",
        "mirror": "",
        "steelman": "",
        "next_step": (
            "Share these responses with the user. "
            "Ask if they want to rebut any challenges. "
            "If yes call submit_rebuttal. "
            "When done call generate_report for the final assessment."
        )
    }
    for r in responses:
        result[r.agent.value] = r.content

    return result


@mcp.tool()
async def submit_rebuttal(session_id: str, rebuttal: str) -> dict:
    """
    Submit the user's rebuttal and get escalated agent attacks for round 2 or 3.

    Call this after stress_test_idea when the user wants to respond to the agents.
    The agents will read the rebuttal and attack harder on unresolved weak points.

    Args:
        session_id: The session_id returned by stress_test_idea
        rebuttal: The user's response. Can be a defense, new information, or concession.

    Returns:
        Escalated responses from the three adversarial agents.
    """
    session = await load_session(session_id)

    if session.rounds:
        session.rounds[-1].rebuttal = rebuttal

    responses = await run_debate_round(session, rebuttal=rebuttal)
    await save_session(session)

    result = {
        "session_id": session_id,
        "round": session.current_round,
        "realist": "",
        "logician": "",
        "mirror": "",
        "next_step": (
            "Share these escalated responses with the user. "
            "They can rebuttal again or call generate_report for the final assessment."
        )
    }
    for r in responses:
        if r.agent.value in result:
            result[r.agent.value] = r.content

    return result


@mcp.tool()
async def generate_report(session_id: str) -> dict:
    """
    Generate the final resilience report for a completed debate session.

    Call this when the user is done debating and wants a final assessment.
    Returns scores, open weaknesses, what they defended well, and a refined pitch.

    Args:
        session_id: The session_id from stress_test_idea

    Returns:
        Scored resilience report with analysis and refined pitch.
    """
    session = await load_session(session_id)

    debate_summary = "ORIGINAL IDEA: " + session.idea + "\n\n"
    for round_data in session.rounds:
        debate_summary += "--- ROUND " + str(round_data.round) + " ---\n"
        for r in round_data.responses:
            debate_summary += r.agent.upper() + ": " + r.content + "\n\n"
        if round_data.rebuttal:
            debate_summary += "USER REBUTTAL: " + round_data.rebuttal + "\n\n"

    raw = await chat(
        system_prompt=REPORT_PROMPT,
        messages=[{"role": "user", "content": debate_summary}],
        max_tokens=700
    )

    clean = raw.strip()
    if clean.startswith("```"):
        lines = clean.split("\n")
        clean = "\n".join(lines[1:-1])

    try:
        report = json.loads(clean)
        report["session_id"] = session_id
        report["idea"] = session.idea
        return report
    except Exception as e:
        return {
            "error": "Report parsing failed: " + str(e),
            "raw_response": raw,
            "session_id": session_id
        }


if __name__ == "__main__":
    # print("IdeaKiller MCP server starting on port 8001...")
    # print("Connect to Claude Desktop via claude_desktop_config.json")
    mcp.run(transport="stdio")