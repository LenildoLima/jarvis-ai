import json
import logging
from collections.abc import AsyncGenerator

from groq import AsyncGroq

from app.core.config import settings
from app.services.search_service import web_search
from app.services.weather_service import get_weather

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_client = AsyncGroq(api_key=settings.GROQ_API_KEY)


def _build_system_prompt(display_name: str) -> str:
    """
    Monta o prompt de sistema dinamicamente, usando o nome real do
    usuário autenticado (vindo do perfil no Supabase), em vez de um
    nome fixo no código.
    """
    return (
        f"Você é a Bell, uma assistente de IA pessoal futurista. "
        f"Trate o usuário como '{display_name}'. Seja direta, útil e com "
        f"um tom levemente técnico, sem ser fria. Respostas curtas e "
        f"naturais, como se estivesse falando em voz alta.\n\n"
        "Nunca apresente uma suposição como se fosse fato confirmado. "
        "Se você não tiver informação confiável sobre algo — principalmente "
        "eventos recentes, questões jurídicas, políticas ou envolvendo pessoas "
        "reais — diga claramente que não tem certeza ou que a informação pode "
        "estar desatualizada. Precisão e honestidade importam mais do que "
        "parecer segura de si.\n\n"
        "IMPORTANTE: suas respostas serão faladas em voz alta, não só lidas. "
        "Por isso, nunca use formatação Markdown (nada de **negrito**, "
        "*itálico*, listas com traços ou números, títulos com #, ou tabelas). "
        "Escreva sempre em frases corridas e naturais, como uma pessoa "
        "falaria em uma conversa — se precisar listar itens, faça isso "
        "dentro do próprio texto (ex: 'primeiro... depois... e por fim...'), "
        "nunca com marcadores visuais.\n\n"
        "Você TEM acesso real e permanente a duas ferramentas, disponíveis "
        "em toda mensagem desta conversa, não apenas uma vez: busca na web "
        "(web_search) e clima em tempo real (get_weather). Você já é capaz "
        "de fazer isso agora mesmo, sempre que precisar — não é uma "
        "funcionalidade hipotética nem algo que precisaria ser implementado. "
        "Nunca diga que não consegue buscar informação em tempo real, que "
        "só pode usar dados fornecidos anteriormente, ou explique como "
        "'alguém implementaria' busca/clima como se você não tivesse isso — "
        "você tem, e pode chamar essas ferramentas de novo a qualquer "
        "momento, inclusive para confirmar ou atualizar uma resposta "
        "anterior.\n\n"
        "Ao usar web_search, sempre escolha o parâmetro recency com "
        "cuidado: para situações em desenvolvimento contínuo (guerras, "
        "conflitos, eleições, notícias do dia, resultados esportivos "
        "recentes), use 'day' ou 'week' — nunca 'any' nesses casos, mesmo "
        "que isso traga menos resultados. Buscar sem filtro de data nesse "
        "tipo de assunto tende a trazer páginas antigas bem posicionadas "
        "mas desatualizadas, o que já causou respostas erradas antes.\n\n"
        "IMPORTANTE SOBRE A ETAPA FINAL: depois que um resultado de busca "
        "já foi injetado na conversa como uma mensagem de sistema, você "
        "está na etapa de gerar a resposta final em texto para o usuário — "
        "NÃO tente chamar nenhuma ferramenta nessa etapa, apenas responda "
        "com base no que já foi encontrado."
    )


_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Busca informações atualizadas na web quando o usuário pergunta "
                "sobre eventos recentes, notícias, dados em tempo real, preços, "
                "rankings, classificações ou qualquer assunto que exija informação "
                "além do conhecimento de treinamento. NÃO use para clima — prefira get_weather."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Consulta de busca em linguagem natural.",
                    },
                    "recency": {
                        "type": "string",
                        "enum": ["day", "week", "month", "year", "any"],
                        "description": (
                            "Quão recente a informação precisa ser. Use 'day' ou "
                            "'week' para situações em desenvolvimento contínuo "
                            "(guerras, conflitos, eleições em andamento, notícias "
                            "do dia, resultados esportivos recentes). Use 'month' "
                            "para algo que muda com menor frequência mas ainda é "
                            "dinâmico (cotações, rankings). Use 'any' apenas para "
                            "fatos estáveis que não mudam com frequência (população "
                            "histórica, dados de censo, fatos históricos)."
                        ),
                    },
                },
                "required": ["query", "recency"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": (
                "Busca o clima/temperatura atual REAL de uma cidade, usando uma API "
                "meteorológica dedicada (mais precisa que busca de texto para esse tipo "
                "de dado). Use esta ferramenta, e não web_search, sempre que a pergunta "
                "for sobre clima, temperatura ou previsão do tempo."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Nome da cidade e estado, ex: 'Cristais, MG'",
                    }
                },
                "required": ["location"],
            },
        },
    },
]

_SEARCH_KEYWORDS = (
    "hoje", "agora", "atual", "atualmente", "recente", "recentes",
    "última", "último", "últimas", "últimos",
    "notícia", "notícias", "clima", "temperatura", "preço", "preços",
    "cotação", "cotações", "dólar", "bitcoin", "eleição", "eleições",
    "resultado", "resultados", "placar", "placares", "jogo", "jogos",
    "partida", "partidas", "lançamento", "lançamentos", "novo",
    "novos", "aconteceu", "aconteceram",
    "quando foi", "quem ganhou", "quem venceu", "quem perdeu",
    "campeão", "campeã", "campeões", "campeãs", "título", "títulos",
    "vencedor", "vencedora", "final da", "finalista",
    "ranking", "rankings", "colocação", "colocações", "colocado",
    "colocada", "posição", "posições", "classificação", "classificações",
    "lugar no", "maior do", "menor do",
)


def _looks_like_factual_query(text: str) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in _SEARCH_KEYWORDS)


def _strip_markdown(text: str) -> str:
    for symbol in ("**", "##", "#", "*", "`"):
        text = text.replace(symbol, "")
    return text


async def stream_chat_response(
    user_message: str,
    history: list[dict[str, str]] | None = None,
    display_name: str = "Comandante",
) -> AsyncGenerator[str, None]:
    """
    Envia a mensagem do usuário para a Groq com suporte a tool calling.
    `display_name` é o nome real do usuário autenticado (vem do perfil
    no Supabase), usado para personalizar o SYSTEM_PROMPT dinamicamente.
    """
    logger.info("Mensagem recebida do usuário: %r", user_message)

    force_search = _looks_like_factual_query(user_message)
    logger.info("force_search (heurística de palavras-chave) = %s", force_search)

    system_prompt = _build_system_prompt(display_name)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        first_response = await _client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            tools=_TOOLS,
            tool_choice="required" if force_search else "auto",
            stream=False,
        )
    except Exception as exc:
        logger.info(
            "Chamada com tool_choice='required' falhou (%s) — "
            "tentando novamente com tool_choice='auto'.",
            exc,
        )
        first_response = await _client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            tools=_TOOLS,
            tool_choice="auto",
            stream=False,
        )

    first_message = first_response.choices[0].message
    tool_calls = first_message.tool_calls or []

    if tool_calls:
        search_summaries: list[str] = []
        for tc in tool_calls:
            args = json.loads(tc.function.arguments)
            tool_name = tc.function.name

            if tool_name == "get_weather":
                location = args.get("location", "")
                logger.info(
                    "Modelo chamou a tool 'get_weather' com location: %r", location
                )
                tool_result = await get_weather(location)
                logger.info("Resultado bruto da get_weather: %s", tool_result)
                search_summaries.append(
                    f"Localização: {location}\nResultado:\n{tool_result}"
                )
            else:
                query = args.get("query", "")
                recency = args.get("recency", "any")
                logger.info(
                    "Modelo chamou a tool 'web_search' com query: %r, recency: %r",
                    query, recency,
                )
                tool_result = web_search(query, recency=recency)
                logger.info("Resultado bruto da web_search: %s", tool_result)
                search_summaries.append(
                    f"Query: {query}\nResultado:\n{tool_result}"
                )

        context_text = "\n\n---\n\n".join(search_summaries)
        messages.append(
            {
                "role": "system",
                "content": (
                    "Resultado de busca na web (use para embasar sua resposta):\n\n"
                    + context_text
                ),
            }
        )
    else:
        logger.info(
            "Modelo NÃO chamou nenhuma tool — respondendo diretamente sem busca."
        )

    # A chamada final NUNCA deve permitir tool calling — mas alguns modelos
    # tentam chamar ferramentas mesmo sem "tools" declarado, guiados pelo
    # próprio texto do SYSTEM_PROMPT (que menciona os nomes das ferramentas).
    # Declarar tool_choice="none" explicitamente é mais seguro do que só
    # omitir o parâmetro "tools". Se mesmo assim falhar (o erro acontece
    # durante a LEITURA do streaming, não na criação da chamada), capturamos
    # isso ao puxar o primeiro chunk manualmente e, se necessário, tentamos
    # de novo sem declarar tools nenhum.
    stream = await _client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        tools=_TOOLS,
        tool_choice="none",
        stream=True,
    )

    stream_iter = stream.__aiter__()
    try:
        first_chunk = await stream_iter.__anext__()
    except StopAsyncIteration:
        return
    except Exception as exc:
        logger.info(
            "Streaming final com tool_choice='none' falhou (%s) — "
            "tentando novamente sem declarar tools.",
            exc,
        )
        stream = await _client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            stream=True,
        )
        stream_iter = stream.__aiter__()
        first_chunk = await stream_iter.__anext__()

    delta = first_chunk.choices[0].delta.content
    if delta:
        yield _strip_markdown(delta)

    async for chunk in stream_iter:
        delta = chunk.choices[0].delta.content
        if delta:
            yield _strip_markdown(delta)