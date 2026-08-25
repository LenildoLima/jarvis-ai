from supabase import create_client, Client
from app.core.config import settings
from datetime import date

# Cliente com a service_role key — tem permissão total, ignora RLS.
# Usado só no backend, NUNCA exposto ao frontend.
_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def get_user_from_token(access_token: str) -> dict | None:
    """
    Valida o token JWT enviado pelo frontend (gerado pelo Supabase Auth
    no login) e retorna os dados do usuário autenticado, ou None se o
    token for inválido/expirado.
    """
    try:
        response = _client.auth.get_user(access_token)
        return {
            "id": response.user.id,
            "email": response.user.email,
        }
    except Exception:
        return None


def get_profile(user_id: str) -> dict | None:
    """Busca o perfil (nome de exibição, etc.) de um usuário."""
    result = (
        _client.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return result.data


def list_conversations(user_id: str) -> list[dict]:
    result = (
        _client.table("conversations")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data


def create_conversation(user_id: str, title: str = "Nova conversa") -> dict:
    result = (
        _client.table("conversations")
        .insert({"user_id": user_id, "title": title})
        .execute()
    )
    return result.data[0]


def get_conversation_messages(conversation_id: str) -> list[dict]:
    result = (
        _client.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return result.data


def save_message(conversation_id: str, role: str, content: str) -> None:
    _client.table("messages").insert(
        {"conversation_id": conversation_id, "role": role, "content": content}
    ).execute()
    # Atualiza o updated_at da conversa, para a lista ordenar por mais recente
    _client.table("conversations").update({"updated_at": "now()"}).eq(
        "id", conversation_id
    ).execute()


def update_conversation_title(conversation_id: str, title: str) -> None:
    _client.table("conversations").update({"title": title}).eq(
        "id", conversation_id
    ).execute()


# Chaves e estado padrão de cada plugin — usado para "semear" o registro
# de um usuário na primeira vez que ele acessa a tela de Plugins.
DEFAULT_PLUGINS = {
    "calendario": False,
    "spotify": False,
    "whatsapp": False,
    "email": False,
    "sistema": True,
    "home_assistant": False,
    "arduino": False,
}


def list_plugins(user_id: str) -> dict[str, bool]:
    """
    Retorna o estado (ligado/desligado) de cada plugin do usuário.
    Se o usuário nunca tiver mexido em nenhum plugin, cria os registros
    com os valores padrão na primeira consulta.
    """
    result = (
        _client.table("plugins")
        .select("plugin_key, enabled")
        .eq("user_id", user_id)
        .execute()
    )
    existing = {row["plugin_key"]: row["enabled"] for row in result.data}

    missing = [key for key in DEFAULT_PLUGINS if key not in existing]
    if missing:
        rows_to_insert = [
            {"user_id": user_id, "plugin_key": key, "enabled": DEFAULT_PLUGINS[key]}
            for key in missing
        ]
        _client.table("plugins").insert(rows_to_insert).execute()
        for key in missing:
            existing[key] = DEFAULT_PLUGINS[key]

    return existing


def set_plugin_enabled(user_id: str, plugin_key: str, enabled: bool) -> None:
    _client.table("plugins").update(
        {"enabled": enabled, "updated_at": "now()"}
    ).eq("user_id", user_id).eq("plugin_key", plugin_key).execute()


def create_reminder(
    user_id: str,
    title: str,
    event_date: str,
    event_time: str,
    location: str | None = None,
    notes: str | None = None,
) -> dict:
    result = (
        _client.table("reminders")
        .insert(
            {
                "user_id": user_id,
                "title": title,
                "event_date": event_date,
                "event_time": event_time,
                "location": location,
                "notes": notes,
            }
        )
        .execute()
    )
    return result.data[0]


def list_reminders(user_id: str, only_pending: bool = False) -> list[dict]:
    query = (
        _client.table("reminders")
        .select("*")
        .eq("user_id", user_id)
        .order("event_date")
        .order("event_time")
    )
    if only_pending:
        query = query.eq("notified", False)
    return query.execute().data


def get_today_reminders(user_id: str) -> list[dict]:
    today_str = date.today().isoformat()
    query = (
        _client.table("reminders")
        .select("*")
        .eq("user_id", user_id)
        .eq("event_date", today_str)
        .order("event_time")
    )
    return query.execute().data


def mark_reminder_notified(reminder_id: str) -> None:
    _client.table("reminders").update({"notified": True}).eq(
        "id", reminder_id
    ).execute()


def delete_reminder(user_id: str, reminder_id: str) -> None:
    _client.table("reminders").delete().eq("id", reminder_id).eq(
        "user_id", user_id
    ).execute()


def save_spotify_tokens(
    user_id: str, access_token: str, refresh_token: str, expires_at_iso: str
) -> None:
    _client.table("spotify_tokens").upsert(
        {
            "user_id": user_id,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at_iso,
            "updated_at": "now()",
        }
    ).execute()


def get_spotify_tokens(user_id: str) -> dict | None:
    result = (
        _client.table("spotify_tokens")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def disconnect_spotify(user_id: str) -> None:
    _client.table("spotify_tokens").delete().eq("user_id", user_id).execute()