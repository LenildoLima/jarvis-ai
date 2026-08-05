from supabase import create_client, Client
from app.core.config import settings

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