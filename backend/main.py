from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.debate import router as debate_router
from app.api.report import router as report_router

app = FastAPI(title="IdeaKiller API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(debate_router)
app.include_router(report_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}