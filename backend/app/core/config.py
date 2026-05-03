from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # OLLAMA_BASE_URL: str = "http://localhost:11434"
    # OLLAMA_MODEL: str = "llama3.1:8b"
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "HARSHAGARWAL0110200222102003"

    class Config:
        env_file = ".env"

settings = Settings()