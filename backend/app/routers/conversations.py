from fastapi import APIRouter, Depends, HTTPException
from app.services import supabase_service
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    return supabase_service.list_conversations(user["id"])


@router.post("/conversations")
async def create_conversation(
    title: str = "Nova conversa", user: dict = Depends(get_current_user)
):
    return supabase_service.create_conversation(user["id"], title)


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str, user: dict = Depends(get_current_user)
):
    # A checagem de que a conversa pertence ao usuário já é garantida
    # pelas policies de Row Level Security no Supabase.
    messages = supabase_service.get_conversation_messages(conversation_id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return messages
