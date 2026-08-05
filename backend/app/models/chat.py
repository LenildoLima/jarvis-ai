from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.auth import get_user_from_ws_token
from app.services.groq_service import stream_chat_response
from app.services import supabase_service

router = APIRouter()


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket, token: str):
    user = await get_user_from_ws_token(token)
    if not user:
        # Fecha a conexão antes de aceitar, com código customizado
        # (4401 é uma convenção comum para "não autorizado" em WS)
        await websocket.close(code=4401)
        return

    profile = supabase_service.get_profile(user["id"])
    display_name = profile["display_name"] if profile else "Comandante"

    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            conversation_id = data.get("conversation_id")
            user_message = data["content"]

            if not conversation_id:
                await websocket.send_json(
                    {"type": "error", "content": "conversation_id é obrigatório"}
                )
                continue

            # Busca o histórico real dessa conversa no banco
            past_messages = supabase_service.get_conversation_messages(conversation_id)
            history = [
                {"role": m["role"], "content": m["content"]} for m in past_messages
            ]

            # Salva a mensagem do usuário
            supabase_service.save_message(conversation_id, "user", user_message)

            await websocket.send_json({"type": "start"})

            full_response = ""
            async for chunk in stream_chat_response(
                user_message, history, display_name
            ):
                full_response += chunk
                await websocket.send_json({"type": "chunk", "content": chunk})

            # Salva a resposta da Nova
            supabase_service.save_message(conversation_id, "assistant", full_response)

            await websocket.send_json({"type": "end"})

    except WebSocketDisconnect:
        pass
