from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import chat, system, conversations, plugins, reminders, spotify

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
app.include_router(plugins.router)
app.include_router(reminders.router)
app.include_router(spotify.router)


@app.get("/")
async def root():
    return {"status": "online", "service": "Nova Core Backend"}
