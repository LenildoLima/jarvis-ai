import asyncio
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from app.core.auth import get_current_user
from app.core.config import settings
from app.services import spotify_service, supabase_service

router = APIRouter()


@router.get("/spotify/login")
async def spotify_login(user: dict = Depends(get_current_user)):
    """Retorna a URL para o frontend redirecionar o navegador ao Spotify."""
    url = spotify_service.build_authorize_url(user["id"])
    return {"url": url}


@router.get("/spotify/callback")
async def spotify_callback(code: str, state: str):
    """
    Chamado pelo próprio Spotify (redirect do navegador), não pelo
    frontend diretamente — por isso não exige autenticação Bearer aqui,
    a identificação do usuário vem do "state".
    """
    user_id = await spotify_service.handle_callback(code, state)
    if user_id:
        # Volta pro frontend, na tela de Plugins, com um indicador de sucesso
        return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/plugins?spotify=connected")
    return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/plugins?spotify=error")


@router.get("/spotify/status")
async def spotify_status(user: dict = Depends(get_current_user)):
    tokens = await asyncio.to_thread(supabase_service.get_spotify_tokens, user["id"])
    return {"connected": tokens is not None}


@router.delete("/spotify/disconnect")
async def spotify_disconnect(user: dict = Depends(get_current_user)):
    await asyncio.to_thread(supabase_service.disconnect_spotify, user["id"])
    return {"status": "ok"}