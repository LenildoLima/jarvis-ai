from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.groq_service import stream_chat_response
from app.core.auth import get_user_from_ws_token
from app.services.supabase_service import get_profile

router = APIRouter()

# Histórico em memória por conversa — troque por Supabase depois,
# mantendo a mesma interface (get_history / append_message).
_conversation_history: dict[str, list[dict[str, str]]] = {}


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    
    token = websocket.query_params.get("token")
    display_name = "Comandante"
    if token:
        user = await get_user_from_ws_token(token)
        if user:
            profile = get_profile(user["id"])
            if profile and profile.get("display_name"):
                display_name = profile["display_name"]

    try:
        while True:
            data = await websocket.receive_json()
            conversation_id = data.get("conversation_id", "default")
            user_message = data["content"]

            history = _conversation_history.setdefault(conversation_id, [])

            # Avisa o frontend que a Nova começou a processar
            await websocket.send_json({"type": "start"})

            full_response = ""
            async for chunk in stream_chat_response(user_message, history, display_name=display_name):
                full_response += chunk
                await websocket.send_json({"type": "chunk", "content": chunk})

            # Atualiza histórico da conversa
            history.append({"role": "user", "content": user_message})
            history.append({"role": "assistant", "content": full_response})

            # Avisa o frontend que a resposta terminou
            await websocket.send_json({"type": "end"})

    except WebSocketDisconnect:
        pass
