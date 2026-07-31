from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class Message(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatIncoming(BaseModel):
    """Mensagem recebida do frontend via WebSocket."""
    conversation_id: str
    content: str


class Conversation(BaseModel):
    id: str
    title: str
    summary: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
