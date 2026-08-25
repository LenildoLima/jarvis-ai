import json
import logging
from datetime import date
from collections.abc import AsyncGenerator

from groq import AsyncGroq

from app.core.config import settings
from app.services.search_service import web_search
from app.services.weather_service import get_weather
from app.services.vision_service import analyze_image
from app.services import supabase_service
from app.services import spotify_service
from app.services import system_monitor

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
    today = date.today().strftime("%A, %d de %B de %Y")
    return (
        f"Hoje é {today}. Use essa data como referência para calcular "
        f"datas relativas mencionadas pelo usuário (amanhã, semana que "
        f"vem, próxima segunda, etc.) ao criar lembretes.\n\n"
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
        "Você TEM acesso real e permanente a cinco ferramentas, disponíveis "
        "em toda mensagem desta conversa, não apenas uma vez: busca na web "
        "(web_search), clima em tempo real (get_weather), análise de "
        "imagens anexadas (analyze_image), busca de música no Spotify "
        "(search_spotify), e tocar música no Spotify (play_spotify). Você "
        "já é capaz de fazer tudo isso agora mesmo, sempre que precisar — "
        "não são funcionalidades hipotéticas nem algo que precisaria ser "
        "implementado. Nunca diga que não consegue buscar informação em "
        "tempo real, que não tem visão computacional/não consegue analisar "
        "imagens, que não tem acesso ao Spotify, ou explique como 'alguém "
        "implementaria' qualquer uma dessas capacidades como se você não "
        "as tivesse — você tem, mesmo quando está apenas conversando sobre "
        "isso sem ter usado a ferramenta ainda na conversa atual. Você pode "
        "chamar essas ferramentas de novo a qualquer momento, inclusive "
        "para confirmar ou atualizar uma resposta anterior.\n\n"
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
        "com base no que já foi encontrado.\n\n"
        "Você também pode criar lembretes/compromissos reais para o "
        "usuário (ex: 'marca uma consulta dia 15 às 14h no consultório "
        "X') usando a ferramenta create_reminder. Sempre confirme de "
        "volta o que foi agendado (data, hora e local) de forma natural "
        "depois de criar. Se o plugin Calendário estiver desativado, "
        "avise o usuário disso de forma natural e sugira ativá-lo na "
        "tela de Plugins, em vez de fingir que criou o lembrete.\n\n"
        "Você também pode buscar músicas, artistas, álbuns e playlists no "
        "Spotify usando a ferramenta search_spotify. Ou, se o usuário "
        "pedir expressamente para TOCAR uma música (ex: 'toca a música X'), "
        "use a ferramenta play_spotify para iniciar a reprodução. "
        "Se o plugin Spotify estiver desativado, ou se o usuário ainda não "
        "tiver conectado a conta do Spotify, avise disso de forma natural, "
        "sugerindo ativar e conectar na tela de Plugins.\n\n"
        "REGRAS DE CONCISÃO EXTREMA (MUITO IMPORTANTE):\n"
        "1. Após reproduzir uma música, NUNCA repita o nome longo da faixa, "
        "nem dê explicações adicionais, se ofereça para trocar ou deseje 'boa audição'. "
        "Diga APENAS de forma extremamente curta, como 'Tocando Tomara', ou 'Coloquei no Spotify'.\n"
        "2. Se buscar músicas e houver múltiplos resultados, NUNCA leia "
        "a lista completa para o usuário. Resuma drasticamente. Diga apenas algo como: "
        "'Encontrei a versão ao vivo e de estúdio, qual prefere?'."
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
    {
        "type": "function",
        "function": {
            "name": "analyze_image",
            "description": (
                "Analisa uma imagem que o usuário anexou à mensagem. Você "
                "(o modelo principal) NÃO consegue ver imagens diretamente — "
                "use esta ferramenta sempre que uma imagem estiver anexada, "
                "passando a pergunta ou instrução do usuário sobre ela."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": (
                            "O que o usuário quer saber sobre a imagem. Se ele "
                            "não especificou nada, use algo como 'Descreva "
                            "detalhadamente o que há nesta imagem'."
                        ),
                    }
                },
                "required": ["question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_reminder",
            "description": (
                "Cria um lembrete/compromisso real para o usuário (consulta, "
                "reunião, tarefa, evento). Use sempre que o usuário pedir para "
                "marcar, agendar ou lembrar de algo em uma data/hora específica."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Título curto do compromisso, ex: 'Consulta médica'",
                    },
                    "date": {
                        "type": "string",
                        "description": (
                            "Data no formato YYYY-MM-DD. Calcule com base na data "
                            "de hoje informada no início desta conversa."
                        ),
                    },
                    "time": {
                        "type": "string",
                        "description": "Horário no formato HH:MM (24 horas), ex: '14:30'",
                    },
                    "location": {
                        "type": "string",
                        "description": "Local do compromisso, se mencionado (opcional).",
                    },
                    "notes": {
                        "type": "string",
                        "description": "Observações adicionais, se houver (opcional).",
                    },
                },
                "required": ["title", "date", "time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_spotify",
            "description": (
                "Busca músicas, artistas, álbuns ou playlists no Spotify. Use "
                "quando o usuário pedir para procurar ou perguntar sobre "
                "música no Spotify, MAS não pediu para tocá-la."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Termos de busca, ex: nome da música ou artista.",
                    },
                    "search_type": {
                        "type": "string",
                        "enum": ["track", "artist", "album", "playlist"],
                        "description": "Tipo de conteúdo buscado. Padrão: track.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "play_spotify",
            "description": (
                "Toca uma música diretamente no Spotify do usuário. Use APENAS "
                "quando o usuário pedir expressamente para ouvir, tocar ou "
                "colocar uma música (ex: 'toca Tomara do Pablo'). Sempre use na busca "
                "a música EXATA mencionada na mensagem mais recente, não reaproveitando "
                "músicas citadas antes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Termos de busca da música a ser tocada.",
                    }
                },
                "required": ["query"],
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
    "marca", "marcar", "agenda", "agendar", "lembrete", "lembra",
    "compromisso", "consulta", "reunião",
    "busca", "buscar", "procura", "procurar", "toca", "tocar",
    "música", "músicas", "som", "cantor", "cantores", "cantora", "cantoras",
    "banda", "álbum", "cd", "playlist", "spotify", "ouvir",
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
    image_base64: str | None = None,
    user_id: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Envia a mensagem do usuário para a Groq com suporte a tool calling.
    `display_name` é o nome real do usuário autenticado (vem do perfil
    no Supabase), usado para personalizar o SYSTEM_PROMPT dinamicamente.
    `image_base64`, se presente, indica que o usuário anexou uma imagem —
    o modelo principal não a recebe diretamente (é só texto), então
    forçamos a delegação para a tool analyze_image (Qwen 3.6 27B).
    `user_id` é necessário para salvar lembretes, checar plugins e
    buscar no Spotify.
    """
    logger.info("Mensagem recebida do usuário: %r", user_message)
    logger.info("Imagem anexada manualmente? %s", bool(image_base64))

    is_morning_briefing = user_message.strip() == "[SISTEMA: GERAR_RESUMO_MATINAL]"
    force_search = _looks_like_factual_query(user_message) and not is_morning_briefing
    logger.info("force_search (heurística de palavras-chave) = %s", force_search)

    system_prompt = _build_system_prompt(display_name)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)

    # Resolve conteúdo do usuário com possíveis injeções
    user_content = user_message
    if is_morning_briefing:
        logger.info("Interceptando comando de resumo matinal.")
        try:
            from datetime import datetime
            now = datetime.now()
            hora_atual = now.strftime("%H:%M")

            # Saudação contextual pelo período do dia
            if now.hour < 12:
                saudacao = "Bom dia"
                periodo = "manhã"
            elif now.hour < 18:
                saudacao = "Boa tarde"
                periodo = "tarde"
            else:
                saudacao = "Boa noite"
                periodo = "noite"

            stats = system_monitor.get_system_stats(interval=0.1)
            reminders = supabase_service.get_today_reminders(user_id) if user_id else []
            
            # Filtra apenas compromissos que ainda não passaram
            future_reminders = [
                r for r in reminders
                if r.get("event_time", "00:00") >= hora_atual
            ]

            agenda_text = "Nenhum compromisso pendente para o restante do dia."
            if future_reminders:
                agenda_text = ", ".join([
                    f"'{r['title']}' às {r['event_time']}" + (f" em {r['location']}" if r.get('location') else "") 
                    for r in future_reminders
                ])
            
            sys_text = f"CPU em {stats.cpu_percent}%. RAM em {stats.ram_percent}%. Disco principal com {stats.disk_percent}% de uso."

            user_content = (
                f"[INSTRUÇÃO INTERNA DE SISTEMA] O usuário acabou de abrir o sistema. Agora são {hora_atual} ({periodo}). "
                f"Use a saudação '{saudacao}' seguida do nome dele. "
                "Aja com MUITA proatividade (estilo assistente hiper inteligente). "
                "Informe curiosamente o estado de estabilidade do PC dele, e leia APENAS os compromissos FUTUROS dele (que ainda não passaram). "
                "Pergunte gentilmente qual é a prioridade ou o plano dele.\n\n"
                f"ESTADO DO PC AGORA: {sys_text}\n"
                f"COMPROMISSOS RESTANTES DE HOJE ({date.today().strftime('%d/%m/%Y')}): {agenda_text}\n\n"
                "Emita sua resposta baseada apenas nisso de forma fluida. NÃO mencione que recebeu instruções internas."
            )
        except Exception as e:
            logger.error(f"Erro ao gerar contexto de resumo matinal: {e}")
            user_content = "Olá, estou online!"
    elif image_base64:
        user_content = f"[Imagem anexada] {user_message}".strip()
        
    messages.append({"role": "user", "content": user_content})

    if image_base64:
        # Não deixamos a critério do modelo — com imagem anexada, a
        # delegação para analyze_image é sempre obrigatória.
        tool_choice = {"type": "function", "function": {"name": "analyze_image"}}
    elif force_search:
        tool_choice = "required"
    else:
        tool_choice = "auto"

    try:
        first_response = await _client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            tools=_TOOLS,
            tool_choice=tool_choice,
            stream=False,
        )
    except Exception as exc:
        logger.info(
            "Chamada com tool_choice=%r falhou (%s) — "
            "tentando novamente com tool_choice='auto'.",
            tool_choice, exc,
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
            elif tool_name == "analyze_image":
                question = args.get("question", "Descreva a imagem")
                logger.info(
                    "Modelo chamou a tool 'analyze_image' com question: %r", question
                )
                if image_base64:
                    tool_result = await analyze_image(image_base64, question)
                else:
                    tool_result = "Nenhuma imagem foi encontrada para analisar."
                logger.info("Resultado bruto da analyze_image: %s", tool_result)
                search_summaries.append(
                    f"Análise da imagem (pergunta: {question}):\n{tool_result}"
                )
            elif tool_name == "create_reminder":
                title = args.get("title", "Compromisso")
                event_date = args.get("date", "")
                event_time = args.get("time", "")
                location = args.get("location")
                notes = args.get("notes")
                logger.info(
                    "Modelo chamou a tool 'create_reminder': title=%r date=%r "
                    "time=%r location=%r",
                    title, event_date, event_time, location,
                )
                if not user_id:
                    tool_result = "Não foi possível identificar o usuário para salvar o lembrete."
                else:
                    plugin_state = supabase_service.list_plugins(user_id)
                    calendario_enabled = plugin_state.get("calendario", False)
                    if not calendario_enabled:
                        logger.info(
                            "Plugin 'calendario' está desativado — lembrete NÃO criado."
                        )
                        tool_result = (
                            "O plugin Calendário está desativado nas configurações. "
                            "Não é possível criar lembretes até que o usuário o "
                            "ative na tela de Plugins."
                        )
                    else:
                        try:
                            supabase_service.create_reminder(
                                user_id, title, event_date, event_time, location, notes
                            )
                            tool_result = (
                                f"Lembrete criado com sucesso: '{title}' em "
                                f"{event_date} às {event_time}"
                                + (f", local: {location}" if location else "")
                            )
                        except Exception as exc:
                            tool_result = f"Erro ao criar o lembrete: {exc}"
                logger.info("Resultado do create_reminder: %s", tool_result)
                search_summaries.append(tool_result)
            elif tool_name == "search_spotify":
                query = args.get("query", "")
                search_type = args.get("search_type", "track")
                logger.info(
                    "Modelo chamou a tool 'search_spotify' com query: %r, type: %r",
                    query, search_type,
                )
                if not user_id:
                    tool_result = "Não foi possível identificar o usuário para buscar no Spotify."
                else:
                    plugin_state = supabase_service.list_plugins(user_id)
                    spotify_enabled = plugin_state.get("spotify", False)
                    if not spotify_enabled:
                        logger.info(
                            "Plugin 'spotify' está desativado — busca NÃO realizada."
                        )
                        tool_result = (
                            "O plugin Spotify está desativado nas configurações. "
                            "Ative-o na tela de Plugins para buscar música."
                        )
                    else:
                        tool_result = await spotify_service.search_spotify(
                            user_id, query, search_type
                        )
                logger.info("Resultado do search_spotify: %s", tool_result)
                search_summaries.append(tool_result)
            elif tool_name == "play_spotify":
                query = args.get("query", "")
                logger.info(
                    "Modelo chamou a tool 'play_spotify' com query: %r",
                    query,
                )
                if not user_id:
                    tool_result = "Não foi possível identificar o usuário para tocar no Spotify."
                else:
                    plugin_state = supabase_service.list_plugins(user_id)
                    spotify_enabled = plugin_state.get("spotify", False)
                    if not spotify_enabled:
                        logger.info(
                            "Plugin 'spotify' está desativado — reprodução NÃO realizada."
                        )
                        tool_result = (
                            "O plugin Spotify está desativado nas configurações. "
                            "Ative-o na tela de Plugins para tocar músicas."
                        )
                    else:
                        tool_result = await spotify_service.play_spotify(
                            user_id, query
                        )
                logger.info("Resultado do play_spotify: %s", tool_result)
                search_summaries.append(tool_result)
            elif tool_name == "web_search":
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
            else:
                logger.info("Tool desconhecida chamada: %r — ignorando.", tool_name)

        context_text = "\n\n---\n\n".join(search_summaries)
        messages[-1]["content"] += (
            "\n\n[RETORNO DAS FERRAMENTAS INTERNAS]\n"
            "Resultados:\n\n"
            + context_text +
            "\n\n[FIM DOS RESULTADOS]\n"
            "INSTRUÇÃO DO SISTEMA: Os comandos já foram executados com sucesso acima. "
            "Você ESTÁ PROIBIDO de tentar chamar funções/tools novamente nesta resposta. "
            "Gere APENAS a resposta final em texto puro (linguagem falada)."
        )
    else:
        logger.info(
            "Modelo NÃO chamou nenhuma tool — respondendo diretamente sem busca."
        )

    # A chamada final NUNCA deve permitir tool calling — a API da Groq
    # às vezes falha com "Tool choice is none, but model called a tool"
    # se enviarmos tools=_TOOLS com tool_choice="none".
    # O mais seguro é simplesmente não enviar o parâmetro tools.
    stream = await _client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        stream=True,
    )

    stream_iter = stream.__aiter__()
    try:
        first_chunk = await stream_iter.__anext__()
    except StopAsyncIteration:
        return
    except Exception as exc:
        logger.error("Erro na leitura inicial do stream final: %s", exc)
        return

    delta = first_chunk.choices[0].delta.content
    if delta:
        yield _strip_markdown(delta)

    async for chunk in stream_iter:
        try:
            delta = chunk.choices[0].delta.content
            if delta:
                yield _strip_markdown(delta)
        except Exception as exc:
            logger.warning(
                "Erro ao processar chunk do stream (será ignorado): %s", exc
            )
            break