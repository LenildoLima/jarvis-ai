import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.auth import get_user_from_ws_token
from app.services.groq_service import stream_chat_response
from app.services import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket, token: str):
    user = await get_user_from_ws_token(token)
    if not user:
        # Fecha a conexão antes de aceitar, com código customizado
        # (4401 é uma convenção comum para "não autorizado" em WS)
        await websocket.close(code=4401)
        return

    profile = await asyncio.to_thread(supabase_service.get_profile, user["id"])
    display_name = profile["display_name"] if profile else "Comandante"

    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            print(f"[WebSocket DEBUG] Payload bruto recebido: {data}")
            conversation_id = data.get("conversation_id")
            user_message = data["content"]
            image_base64 = data.get("image_base64")

            print(f"[WebSocket] Recebido: conversation_id={conversation_id}, image_base64_present={bool(image_base64)}, image_base64_length={len(image_base64) if image_base64 else 0}")

            if not conversation_id:
                await websocket.send_json(
                    {"type": "error", "content": "conversation_id é obrigatório"}
                )
                continue

            # Busca o histórico real dessa conversa no banco
            past_messages = await asyncio.to_thread(supabase_service.get_conversation_messages, conversation_id)
            history = [
                {"role": m["role"], "content": m["content"]} for m in past_messages
            ]

            is_first_message = len(past_messages) == 0

            # Salva a mensagem do usuário — só o texto; a imagem em si
            # não é persistida (processada na hora e descartada depois)
            saved_user_text = user_message
            if image_base64:
                saved_user_text = f"[Imagem anexada] {user_message}".strip()
            # Verifica se user_message não é nulo e não é vazio, mas salva "Imagem anexada"
            await asyncio.to_thread(supabase_service.save_message, conversation_id, "user", saved_user_text)

            # Se essa é a primeira mensagem da conversa, gera um título
            # automático baseado nela (simples truncamento, sem custo
            # extra de chamada à IA) — substitui o "Nova conversa" padrão.
            if is_first_message:
                title_source = user_message.strip() or "Conversa com imagem"
                auto_title = (
                    title_source[:47] + "..."
                    if len(title_source) > 50
                    else title_source
                )
                await asyncio.to_thread(supabase_service.update_conversation_title, conversation_id, auto_title)
                print(f"[WebSocket] Título automático gerado: {auto_title!r}")

            await websocket.send_json({"type": "start"})

            full_response = ""
            try:
                async for chunk in stream_chat_response(
                    user_message, history, display_name, image_base64=image_base64,
                    user_id=user["id"],
                ):
                    full_response += chunk
                    await websocket.send_json({"type": "chunk", "content": chunk})

                # Salva a resposta da Nova
                await asyncio.to_thread(supabase_service.save_message, conversation_id, "assistant", full_response)

                await websocket.send_json({"type": "end"})

            except Exception as exc:
                logger.error("Erro durante streaming da resposta: %s", exc)
                # Envia o que já foi acumulado (pode ser uma resposta parcial)
                if full_response:
                    await asyncio.to_thread(supabase_service.save_message, conversation_id, "assistant", full_response)
                # Avisa o cliente e termina esta mensagem de forma limpa
                # sem derrubar a conexão WebSocket inteira.
                await websocket.send_json(
                    {"type": "error", "content": "Ocorreu um erro ao processar sua mensagem."}
                )
                await websocket.send_json({"type": "end"})

    except WebSocketDisconnect:
        pass