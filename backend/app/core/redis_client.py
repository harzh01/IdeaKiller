import redis.asyncio as redis
from app.models.debate import DebateSession
from app.core.config import settings

# Create a connection pool (reuses connections efficiently)
_pool = None

async def get_redis():
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(settings.REDIS_URL)
    return redis.Redis(connection_pool=_pool)

async def save_session(session: DebateSession) -> None:
    """Save debate session to Redis. Expires after 2 hours."""
    r = await get_redis()
    key = f"debate:{session.session_id}"
    # model_dump_json() converts the Pydantic model to JSON string
    await r.setex(key, 7200, session.model_dump_json())

async def load_session(session_id: str) -> DebateSession:
    """Load a debate session from Redis."""
    r = await get_redis()
    key = f"debate:{session_id}"
    data = await r.get(key)
    if not data:
        raise ValueError(f"Session not found: {session_id}")
    # model_validate_json() converts JSON string back to Pydantic model
    return DebateSession.model_validate_json(data)