import uuid
from fastapi import APIRouter, HTTPException
from app.models.chat import Conversation

router = APIRouter()

# Armazenamento em memória — trocar por Supabase depois,
# mantendo as mesmas rotas e formatos de resposta.
_conversations: dict[str, Conversation] = {}


@router.get("/conversations", response_model=list[Conversation])
async def list_conversations():
    return list(_conversations.values())


@router.post("/conversations", response_model=Conversation)
async def create_conversation(title: str = "Nova conversa"):
    conversation = Conversation(id=str(uuid.uuid4()), title=title)
    _conversations[conversation.id] = conversation
    return conversation


@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    conversation = _conversations.get(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return conversation
