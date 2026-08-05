from tavily import TavilyClient
from app.core.config import settings

_client = TavilyClient(api_key=settings.TAVILY_API_KEY)


def web_search(query: str, recency: str = "any", max_results: int = 6) -> str:
    """
    Executa uma busca real na web via Tavily e retorna um resumo em texto
    pronto para ser injetado de volta na conversa com o modelo.

    `recency` filtra os resultados por data de publicação — essencial para
    temas em desenvolvimento contínuo (guerras, eleições, esportes), onde
    busca sem filtro de data tende a trazer páginas antigas bem
    posicionadas mas desatualizadas. Valores aceitos pela Tavily:
    "day", "week", "month", "year". "any" não aplica filtro nenhum.

    Retorna string (não dict) porque é isso que a API de tool calling
    da Groq espera no campo "content" da mensagem de resposta da tool.
    """
    try:
        search_kwargs = {
            "query": query,
            "max_results": max_results,
            "include_answer": False,
            "search_depth": "advanced",
        }
        if recency and recency != "any":
            search_kwargs["time_range"] = recency

        response = _client.search(**search_kwargs)
    except Exception as exc:
        return f"Erro ao buscar na web: {exc}"

    parts = []

    for result in response.get("results", []):
        title = result.get("title", "Sem título")
        url = result.get("url", "")
        published = result.get("published_date", "")
        content = result.get("content", "")[:600]
        date_info = f" [publicado em: {published}]" if published else ""
        parts.append(f"- {title}{date_info} ({url}): {content}")

    if not parts:
        return "Nenhum resultado encontrado para essa busca."

    return "\n".join(parts)