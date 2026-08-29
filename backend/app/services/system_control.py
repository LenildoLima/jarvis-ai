#app/services/system_control.py
import subprocess
import webbrowser
import logging
import urllib.parse
from typing import Optional

logger = logging.getLogger(__name__)

# Mapeamento para acelerar a busca de aplicativos comuns
KNOWN_APPS = {
    "bloco de notas": "notepad.exe",
    "notepad": "notepad.exe",
    "calculadora": "calc.exe",
    "calc": "calc.exe",
    "paint": "mspaint.exe",
    "explorador de arquivos": "explorer.exe",
    "explorer": "explorer.exe",
    "chrome": "chrome.exe",
    "edge": "msedge.exe",
    "youtube": "chrome.exe https://youtube.com",
    "spotify": "spotify.exe",
}

def open_application(app_name: str) -> str:
    app_lower = app_name.lower().strip()
    target = KNOWN_APPS.get(app_lower, app_lower)
    
    try:
        # Popen de forma destacada para não bloquear o backend
        subprocess.Popen(target, shell=True)
        return f"Aplicativo '{app_name}' inicializado com sucesso."
    except Exception as e:
        logger.error(f"Erro ao abrir aplicativo '{app_name}': {e}")
        return f"Erro ao abrir o aplicativo: {str(e)}"

def open_url(url: str) -> str:
    try:
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url
        # Usa 'start' do Windows para garantir abertura correta de URLs com caracteres especiais
        subprocess.Popen(["cmd", "/c", "start", "", url], shell=False)
        return f"URL '{url}' aberta no navegador padrão."
    except Exception as e:
        logger.error(f"Erro ao abrir URL '{url}': {e}")
        return f"Erro ao abrir a URL: {str(e)}"

def toggle_audio() -> str:
    try:
        # Script Powershell embutido para simular a tecla física de mudo no teclado.
        # Código 173 (0xAD) = Volume Mute toggle.
        ps_script = "(new-object -com wscript.shell).SendKeys([char]173)"
        subprocess.run(["powershell", "-Command", ps_script], capture_output=True)
        return "Estado do som alterado com sucesso (Mutado/Desmutado)."
    except Exception as e:
        logger.error(f"Erro ao mutar sistema: {e}")
        return f"Erro ao gerenciar volume: {str(e)}"

def search_youtube(query: str) -> str:
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded_query}"
        subprocess.Popen(["cmd", "/c", "start", "", url], shell=False)
        return f"Busca no YouTube por '{query}' aberta no navegador."
    except Exception as e:
        logger.error(f"Erro ao buscar no youtube por '{query}': {e}")
        return f"Erro ao buscar no youtube: {str(e)}"

def play_youtube_video(query: str) -> str:
    """Extrai a URL do primeiro vídeo do YouTube via HTTP e abre diretamente no browser."""
    import re
    import json
    import webbrowser
    import urllib.request

    try:
        params = urllib.parse.urlencode({"search_query": query})
        search_url = f"https://www.youtube.com/results?{params}"
        logger.info(f"[YouTube] Buscando primeiro vídeo em: {search_url} (sem forçar ordenação por data)")

        req = urllib.request.Request(
            search_url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "pt-BR,pt;q=0.9",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Extrai o JSON embutido ytInitialData para pegar o primeiro videoId
        match = re.search(r"var ytInitialData\s*=\s*(\{.*?\});</script>", html, re.DOTALL)
        video_id = None
        if match:
            try:
                data = json.loads(match.group(1))
                contents = (
                    data.get("contents", {})
                    .get("twoColumnSearchResultsRenderer", {})
                    .get("primaryContents", {})
                    .get("sectionListRenderer", {})
                    .get("contents", [{}])[0]
                    .get("itemSectionRenderer", {})
                    .get("contents", [])
                )
                for item in contents:
                    vid = item.get("videoRenderer", {}).get("videoId")
                    if vid:
                        video_id = vid
                        break
            except Exception as parse_err:
                logger.warning(f"[YouTube] Falha ao parsear ytInitialData: {parse_err}")

        if video_id:
            watch_url = f"https://www.youtube.com/watch?v={video_id}"
            logger.info(f"[YouTube] Abrindo vídeo diretamente: {watch_url}")
            webbrowser.open(watch_url)
            return f"Primeiro vídeo encontrado e aberto: https://www.youtube.com/watch?v={video_id}"
        else:
            # Fallback: abre a página de resultados
            logger.warning("[YouTube] Não foi possível extrair videoId — abrindo página de busca.")
            webbrowser.open(search_url)
            return f"Não consegui extrair o vídeo diretamente. Página de busca aberta: {search_url}"

    except Exception as e:
        logger.error(f"Erro ao reproduzir vídeo no youtube '{query}': {e}")
        return f"Erro ao reproduzir no youtube: {str(e)}"

def manage_power(action: str, delay_minutes: int = 0) -> str:
    try:
        if action == "cancel":
            subprocess.run(["shutdown", "/a"], capture_output=True)
            return "Comando de desligamento agendado foi cancelado."
        elif action == "shutdown":
            seconds = max(0, delay_minutes * 60)
            subprocess.run(["shutdown", "/s", "/t", str(seconds)], capture_output=True)
            return f"O computador será desligado em {delay_minutes} minuto(s)."
        else:
            return f"Ação de energia '{action}' desconhecida."
    except Exception as e:
        logger.error(f"Erro ao gerenciar energia: {e}")
        return f"Erro ao gerenciar energia do PC: {str(e)}"

def execute_command(action: str, target: Optional[str] = None, delay_minutes: Optional[int] = 0, element_text: Optional[str] = None) -> str:
    if action == "open_app":
        return open_application(target or "")
    elif action == "open_url":
        return open_url(target or "")
    elif action == "search_youtube":
        return search_youtube(target or "")
    elif action == "play_youtube_video":
        return play_youtube_video(target or "")
    elif action == "browser_click":
        from app.services import browser_control
        return browser_control.click_on_page(target or "", element_text or "")
    elif action in ["mute", "unmute"]:
        return toggle_audio() # O atalho funciona como Toggle no Windows
    elif action in ["shutdown", "cancel_shutdown"]:
        return manage_power("cancel" if action == "cancel_shutdown" else "shutdown", delay_minutes or 0)
    else:
        return f"Ação '{action}' não suportada pelo sistema integrado."
