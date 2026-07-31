import json
import logging
from collections.abc import AsyncGenerator

from groq import AsyncGroq

from app.core.config import settings
from app.services.search_service import web_search
from app.services.weather_service import get_weather

# ---------------------------------------------------------------------------
# Logging — aparece no console onde o uvicorn está rodando
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cliente Groq
# ---------------------------------------------------------------------------
_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# ---------------------------------------------------------------------------
# Personalidade da Nova — ajuste livremente aqui, sem mexer em mais nada
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "Você é a Nova, uma assistente de IA pessoal futurista. "
    "Trate o usuário como 'Lenildo Lima'. Seja direta, útil e com um tom "
    "levemente técnico, sem ser fria. Respostas curtas e naturais, "
    "como se estivesse falando em voz alta.\n\n"
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
    "nunca com marcadores visuais."
)

# ---------------------------------------------------------------------------
# Definição das tools para o Groq
# ---------------------------------------------------------------------------
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
                    }
                },
                "required": ["query"],
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

# ---------------------------------------------------------------------------
# Heurística de palavras-chave para forçar busca
# ---------------------------------------------------------------------------
_SEARCH_KEYWORDS = (
    "hoje", "agora", "atual", "atualmente", "recente", "recentes",
    "última", "último", "últimas", "últimos",
    "notícia", "notícias", "clima", "temperatura", "preço", "preços",
    "cotação", "cotações", "dólar", "bitcoin", "eleição", "eleições",
    "resultado", "resultados", "placar", "placares", "jogo", "jogos",
    "partida", "partidas", "lançamento", "lançamentos", "novo", "nova",
    "novos", "novas", "aconteceu", "aconteceram",
    "quando foi", "quem ganhou", "quem venceu", "quem perdeu",
    "ranking", "rankings", "colocação", "colocações", "colocado",
    "colocada", "posição", "posições", "classificação", "classificações",
    "lugar no", "maior do", "menor do",
)


def _looks_like_factual_query(text: str) -> bool:
    """Retorna True se a mensagem contiver palavras-chave que sugerem busca."""
    lowered = text.lower()
    return any(kw in lowered for kw in _SEARCH_KEYWORDS)


def _strip_markdown(text: str) -> str:
    """
    Remove símbolos de Markdown que às vezes escapam da instrução do
    SYSTEM_PROMPT (o modelo nem sempre obedece 100%). Como a resposta é
    falada em voz alta, símbolos como ** ou # não podem chegar ao
    frontend/TTS. Aplicado chunk a chunk durante o streaming — em casos
    raros um "**" pode ficar dividido entre dois chunks e sobrar um "*"
    solto, o que é um efeito colateral aceitável frente ao ganho geral.
    """
    for symbol in ("**", "##", "#", "*", "`"):
        text = text.replace(symbol, "")
    return text


# ---------------------------------------------------------------------------
# Função principal de streaming
# ---------------------------------------------------------------------------
async def stream_chat_response(
    user_message: str,
    history: list[dict[str, str]] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Envia a mensagem do usuário para a Groq com suporte a tool calling.
    Se o modelo (ou a heurística) decidir buscar na web, executa a busca
    via Tavily e injeta o resultado antes de gerar a resposta final.

    `history` é uma lista de mensagens anteriores no formato
    [{"role": "user"|"assistant", "content": "..."}] — opcional.
    """
    # --- LOG 1: mensagem recebida ---
    logger.info("Mensagem recebida do usuário: %r", user_message)

    force_search = _looks_like_factual_query(user_message)

    # --- LOG 2: heurística ---
    logger.info("force_search (heurística de palavras-chave) = %s", force_search)

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    # Primeira chamada ao modelo (com tools disponíveis)
    try:
        first_response = await _client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            tools=_TOOLS,
            # "required" força ALGUMA tool quando a heurística dispara, mas
            # deixa o modelo escolher entre web_search e get_weather.
            tool_choice="required" if force_search else "auto",
            stream=False,
        )
    except Exception as exc:
        # A Groq rejeita com 400 quando tool_choice="required" mas o modelo
        # julga que não precisa de nenhuma ferramenta (ex: pergunta de
        # contexto que já dá pra responder com o histórico da conversa).
        # Nesse caso, refazemos a chamada sem forçar, deixando o modelo
        # decidir livremente.
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
        # --- LOG 3: model chamou uma tool ---
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

            else:  # web_search (padrão)
                query = args.get("query", "")
                logger.info(
                    "Modelo chamou a tool 'web_search' com query: %r", query
                )
                tool_result = web_search(query)
                logger.info("Resultado bruto da web_search: %s", tool_result)
                search_summaries.append(
                    f"Query: {query}\nResultado:\n{tool_result}"
                )

        # Injeta os resultados como mensagem de sistema — sem usar o protocolo
        # oficial tool_calls/role:"tool", que faria o modelo tentar usar tools
        # de novo na chamada final (onde não há tools declaradas).
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
        # --- LOG 5: nenhuma tool chamada ---
        logger.info(
            "Modelo NÃO chamou nenhuma tool — respondendo diretamente sem busca."
        )

    # Resposta final em streaming — sem parâmetro tools para evitar que o modelo
    # tente chamar ferramentas novamente.
    stream = await _client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield _strip_markdown(delta)