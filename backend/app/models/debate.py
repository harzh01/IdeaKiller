from pydantic import BaseModel
from typing import Optional
from enum import Enum

class AgentKey(str, Enum):
    REALIST  = "realist"
    LOGICIAN = "logician"
    MIRROR   = "mirror"
    STEELMAN = "steelman"

class AgentResponse(BaseModel):
    agent: AgentKey
    content: str
    round: int

class RoundHistory(BaseModel):
    round: int
    responses: list[AgentResponse] = []
    rebuttal: Optional[str] = None

class DebateSession(BaseModel):
    session_id: str
    idea: str
    current_round: int = 0
    max_rounds: int = 3
    rounds: list[RoundHistory] = []
    # Flat list of all agent responses for report generation
    all_responses: dict[str, list[str]] = {}
    status: str = "active"  # active | complete

class StartDebateRequest(BaseModel):
    idea: str

class RebuttalRequest(BaseModel):
    rebuttal: str

class ResilienceReport(BaseModel):
    realist_score: float
    logician_score: float
    mirror_score: float
    overall_score: float
    open_weaknesses: str
    defended_well: str
    original_pitch: str
    refined_pitch: str
