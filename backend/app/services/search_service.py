from tavily import TavilyClient
from app.core.config import settings

_client = TavilyClient(api_key=settings.TAVILY_API_KEY)


def web_search(query: str, max_results: int = 6) -> str:
    """
    Executa uma busca real na web via Tavily e retorna um resumo em texto
    pronto para ser injetado de volta na conversa com o modelo.

    Retorna string (não dict) porque é isso que a API de tool calling
    da Groq espera no campo "content" da mensagem de resposta da tool.
    """
    try:
        response = _client.search(
            query=query,
            max_results=max_results,
            # include_answer=True foi desativado de propósito: o "resumo"
            # pronto que a Tavily gera com IA própria já se mostrou capaz
            # de alucinar/misturar datas por conta própria (ex: inventou um
            # resultado e uma data errados mesmo com os dados corretos
            # disponíveis nos resultados brutos logo abaixo). Preferimos
            # entregar só os resultados brutos e deixar nosso próprio
            # modelo (já instruído a ser honesto) interpretar.
            include_answer=False,
            search_depth="advanced",
        )
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