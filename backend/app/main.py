from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import chat, system, conversations

app = FastAPI(title="Nova Core - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(system.router)
app.include_router(conversations.router)


@app.get("/")
async def root():
    return {"status": "online", "service": "Nova Core Backend"}
