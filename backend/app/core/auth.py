from fastapi import Header, HTTPException
from app.services.supabase_service import get_user_from_token


async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Dependência do FastAPI: extrai o token do header
    "Authorization: Bearer <token>" e valida com o Supabase.
    Usar em qualquer rota REST que exija login.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente ou mal formatado")

    token = authorization.removeprefix("Bearer ").strip()
    user = get_user_from_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    return user


async def get_user_from_ws_token(token: str) -> dict | None:
    """
    Mesma validação, mas para uso no WebSocket, onde o token chega
    como query param (ex: ws://.../ws/chat?token=xxx), já que o
    navegador não permite enviar headers customizados em WebSocket.
    """
    return get_user_from_token(token)