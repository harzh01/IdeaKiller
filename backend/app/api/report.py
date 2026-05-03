import json
from fastapi import APIRouter
from app.core.ollama_client import chat
from app.agents.prompts import REPORT_PROMPT
from app.core.redis_client import load_session, save_session
from app.models.debate import ResilienceReport

router = APIRouter(prefix="/report", tags=["report"])


@router.post("/{session_id}/generate")
async def generate_report(session_id: str):
    """Generate the final resilience report for a completed debate."""
    session = await load_session(session_id)

    # Build a summary of the full debate for the report model
    debate_summary = f"ORIGINAL IDEA: {session.idea}\n\n"

    for round_data in session.rounds:
        debate_summary += f"--- ROUND {round_data.round} ---\n"
        for r in round_data.responses:
            debate_summary += f"{r.agent.upper()}: {r.content}\n\n"
        if round_data.rebuttal:
            debate_summary += f"USER REBUTTAL: {round_data.rebuttal}\n\n"

    # Ask the model to generate the report
    raw = await chat(
        system_prompt=REPORT_PROMPT,
        messages=[{"role": "user", "content": debate_summary}],
        max_tokens=600
    )

    # Parse the JSON response
    # Strip any accidental markdown code fences
    clean = raw.strip()
    if clean.startswith("```"):
        lines = clean.split("\n")
        clean = "\n".join(lines[1:-1])

    try:
        data = json.loads(clean)
        report = ResilienceReport(**data)
    except Exception as e:
        # Fallback if JSON parsing fails
        return {"error": f"Report generation failed: {str(e)}", "raw": raw}

    # Save report to session
    session.status = "complete"
    await save_session(session)

    return report
