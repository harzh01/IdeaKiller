import json
import uuid
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.debate import DebateSession, StartDebateRequest, RebuttalRequest
from app.orchestrator.debate import run_debate_round
from app.core.redis_client import save_session, load_session

router = APIRouter(prefix="/debate", tags=["debate"])


def format_sse(data: dict) -> str:
    """Format data as a Server-Sent Event string."""
    return f"data: {json.dumps(data)}\n\n"


@router.post("/start")
async def start_debate(body: StartDebateRequest):
    """
    Start a new debate session.
    Creates a session, fires all 4 agents, streams responses back.
    """
    session = DebateSession(
        session_id=str(uuid.uuid4()),
        idea=body.idea
    )

    async def event_stream():
        # First, send the session ID so frontend can use it for rebuttals
        yield format_sse({
            "event": "session_created",
            "session_id": session.session_id
        })

        # Run round 1
        responses = await run_debate_round(session)

        # Stream each agent response as it comes
        # (they all finish together since we use gather,
        #  but we stagger the SSE sends for visual effect)
        import asyncio
        for i, response in enumerate(responses):
            await asyncio.sleep(i * 0.3)  # stagger 300ms apart
            yield format_sse({
                "event": "agent_response",
                "agent": response.agent,
                "content": response.content,
                "round": response.round
            })

        # Save session to Redis for next round
        await save_session(session)

        # Signal round is complete
        yield format_sse({
            "event": "round_complete",
            "round": session.current_round,
            "can_continue": session.current_round < session.max_rounds
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"  # prevents nginx buffering
        }
    )


@router.post("/{session_id}/rebuttal")
async def submit_rebuttal(session_id: str, body: RebuttalRequest):
    """Submit a rebuttal and get the next round of attacks."""
    session = await load_session(session_id)

    # Store the rebuttal in the last round
    if session.rounds:
        session.rounds[-1].rebuttal = body.rebuttal

    async def event_stream():
        responses = await run_debate_round(session, rebuttal=body.rebuttal)

        import asyncio
        for i, response in enumerate(responses):
            await asyncio.sleep(i * 0.3)
            yield format_sse({
                "event": "agent_response",
                "agent": response.agent,
                "content": response.content,
                "round": response.round
            })

        await save_session(session)
        yield format_sse({
            "event": "round_complete",
            "round": session.current_round,
            "can_continue": session.current_round < session.max_rounds
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/{session_id}/session")
async def get_session(session_id: str):
    """Get the current state of a debate session."""
    session = await load_session(session_id)
    return session
