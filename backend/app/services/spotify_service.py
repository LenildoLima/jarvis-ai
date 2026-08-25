import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
import httpx
import logging
from app.core.config import settings
from app.services import supabase_service

logger = logging.getLogger(__name__)

_AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
_TOKEN_URL = "https://accounts.spotify.com/api/token"
_API_BASE = "https://api.spotify.com/v1"

# Escopos mínimos para busca e reprodução
_SCOPES = "user-read-private user-read-email user-modify-playback-state user-read-playback-state user-read-currently-playing"

# Mapa temporário em memória: state (string aleatória) -> user_id.
# Usado para "lembrar" qual usuário iniciou o login OAuth quando o
# Spotify redireciona de volta (o redirect não carrega nosso token de
# autenticação, só o "state" que nós mesmos definimos).
_pending_states: dict[str, str] = {}


def build_authorize_url(user_id: str) -> str:
    """Gera a URL de login do Spotify e guarda o state -> user_id."""
    state = str(uuid.uuid4())
    _pending_states[state] = user_id

    params = {
        "client_id": settings.SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
        "scope": _SCOPES,
        "state": state,
    }
    return f"{_AUTHORIZE_URL}?{urlencode(params)}"


async def handle_callback(code: str, state: str) -> str | None:
    """
    Troca o "code" pelo access_token/refresh_token, salva no Supabase
    para o usuário correspondente ao state. Retorna o user_id em caso
    de sucesso, ou None se o state for desconhecido/expirado.
    """
    user_id = _pending_states.pop(state, None)
    if not user_id:
        return None

    async with httpx.AsyncClient() as client:
        response = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
            },
            auth=(settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_CLIENT_SECRET),
        )
        response.raise_for_status()
        data = response.json()

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=data["expires_in"])
    supabase_service.save_spotify_tokens(
        user_id=user_id,
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        expires_at_iso=expires_at.isoformat(),
    )
    return user_id


async def _get_valid_access_token(user_id: str) -> str | None:
    """Retorna um access_token válido, renovando via refresh_token se expirado."""
    tokens = supabase_service.get_spotify_tokens(user_id)
    if not tokens:
        return None

    expires_at = datetime.fromisoformat(tokens["expires_at"])
    if datetime.now(timezone.utc) < expires_at - timedelta(seconds=30):
        return tokens["access_token"]

    # Token expirado — renova usando o refresh_token.
    async with httpx.AsyncClient() as client:
        response = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": tokens["refresh_token"],
            },
            auth=(settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_CLIENT_SECRET),
        )
        if response.status_code != 200:
            return None
        data = response.json()

    new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=data["expires_in"])
    supabase_service.save_spotify_tokens(
        user_id=user_id,
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token", tokens["refresh_token"]),
        expires_at_iso=new_expires_at.isoformat(),
    )
    return data["access_token"]


async def search_spotify(user_id: str, query: str, search_type: str = "track") -> str:
    """
    Busca música/artista/álbum/playlist no Spotify e retorna um resumo
    em texto, pronto para a Bell interpretar e responder.
    """
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        return (
            "O usuário ainda não conectou a conta do Spotify. "
            "Sugira que ele conecte na tela de Plugins."
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{_API_BASE}/search",
            params={"q": query, "type": search_type, "limit": 5},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code != 200:
            return f"Erro ao buscar no Spotify: {response.status_code} {response.text[:200]}"
        data = response.json()

    key = f"{search_type}s"
    items = data.get(key, {}).get("items", [])
    if not items:
        return "Nenhum resultado encontrado no Spotify para essa busca."

    parts = []
    for item in items:
        name = item.get("name", "Sem nome")
        artists = ", ".join(a["name"] for a in item.get("artists", [])) if "artists" in item else ""
        parts.append(f"- {name}" + (f" ({artists})" if artists else ""))

    return "Resultados encontrados no Spotify:\n" + "\n".join(parts)


async def play_spotify(user_id: str, query: str) -> str:
    """
    Busca uma música (ou artista/álbum) baseada na query e inicia
    a reprodução no dispositivo ativo do usuário.
    """
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        return (
            "O usuário ainda não conectou a conta do Spotify. "
            "Sugira que ele conecte na tela de Plugins."
        )

    async with httpx.AsyncClient() as client:
        # Passo 1: Busca o primeiro resultado
        search_res = await client.get(
            f"{_API_BASE}/search",
            params={"q": query, "type": "track", "limit": 1},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if search_res.status_code != 200:
            return f"Erro ao buscar no Spotify: {search_res.status_code} {search_res.text[:200]}"
            
        search_data = search_res.json()
        tracks = search_data.get("tracks", {}).get("items", [])
        if not tracks:
            return "Nenhuma música foi encontrada no Spotify para tocar."
            
        track = tracks[0]
        track_uri = track.get("uri")
        track_name = track.get("name", "Música")
        artists = ", ".join(a["name"] for a in track.get("artists", [])) if "artists" in track else ""
        
        # Passo 2: Toca o item
        play_res = await client.put(
            f"{_API_BASE}/me/player/play",
            json={"uris": [track_uri]},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if play_res.status_code == 404:
            # Se não houver dispositivo ativo, o Spotify retorna 404.
            # Vamos tentar descobrir se há algum dispositivo (mesmo inativo) para "acordá-lo".
            logger.info("404 ao tentar tocar, buscando dispositivos em background para fallback.")
            dev_res = await client.get(
                f"{_API_BASE}/me/player/devices",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if dev_res.status_code == 200:
                devices = dev_res.json().get("devices", [])
                if devices:
                    # Escolhe o primeiro dispositivo disponível (ou poderia priorizar por tipo)
                    target_device = devices[0]
                    target_id = target_device.get("id")
                    logger.info("Dispositivo encontrado: %s (%s). Retentando play...", target_device.get("name"), target_device.get("type"))
                    
                    play_res = await client.put(
                        f"{_API_BASE}/me/player/play?device_id={target_id}",
                        json={"uris": [track_uri]},
                        headers={"Authorization": f"Bearer {access_token}"},
                    )

        if play_res.status_code == 204:
            return f"Tocando agora no Spotify do usuário: {track_name} ({artists})"
        elif play_res.status_code == 404:
            logger.error("Erro 404 no play_spotify: Nenhum dispositivo ativo encontrado. Resposta: %s", play_res.text)
            return "Erro: O Spotify não está aberto ou não há dispositivo ativo no momento. Peça ao usuário para abrir o aplicativo do Spotify antes de tentar tocar a música."
        elif play_res.status_code == 403:
            logger.error("Erro 403 no play_spotify: Problema de permissão (Forbidden). Resposta: %s", play_res.text)
            return "Erro 403: O usuário não possui Spotify Premium ativo para a conta de Desenvolvedor, ou o recurso está bloqueado, ou faltam permissões no token."
        else:
            logger.error("Erro genérico %d no play_spotify: %s", play_res.status_code, play_res.text)
            return f"Erro ao tentar tocar a música: {play_res.status_code} {play_res.text[:200]}"