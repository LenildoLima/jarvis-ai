#app/services/browser_control.py
"""
Controle de navegador via Playwright.
A Bell pode clicar em elementos de sites da lista branca (ALLOWED_DOMAINS).
Nenhuma ação de preenchimento de senha ou navegação externa é permitida.
"""

import asyncio
import logging
from urllib.parse import urlparse

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

# ─── Lista branca de domínios autorizados ──────────────────────────────────────
ALLOWED_DOMAINS = {
    "youtube.com",
    "www.youtube.com",
    "spotify.com",
    "open.spotify.com",
    "google.com",
    "www.google.com",
    "github.com",
    "www.github.com",
}


def _domain_allowed(url: str) -> bool:
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        return parsed.netloc in ALLOWED_DOMAINS
    except Exception:
        return False


async def _click_on_page(url: str, element_text: str) -> str:
    """Conecta no Chrome via CDP e clica no elemento. Se não conseguir, abre no browser padrão."""
    if not _domain_allowed(url):
        return f"Domínio não autorizado. Apenas estes sites são permitidos: {', '.join(sorted(ALLOWED_DOMAINS))}"

    if not url.startswith("http"):
        url = "https://" + url

    async with async_playwright() as p:
        try:
            logger.info("[BrowserControl] Tentando conectar no Chrome pela porta 9222 (CDP)...")
            browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
            context = browser.contexts[0]
            if context.pages:
                page = await context.new_page()
            else:
                page = await browser.new_page()
            logger.info("[BrowserControl] Conectado ao Chrome existente via CDP!")
        except Exception as e:
            logger.warning(
                "[BrowserControl] CDP indisponível (%s). "
                "Abrindo URL no navegador padrão via subprocess (browser permanece aberto). "
                "Dica: Inicie o Chrome com --remote-debugging-port=9222 para habilitar clique automático.",
                e,
            )
            import webbrowser
            webbrowser.open(url)
            return f"URL '{url}' aberta no navegador padrão (sem clique automático — feche o Chrome, reinicie com --remote-debugging-port=9222 para habilitar)."

        try:
            logger.info("[BrowserControl] Navegando para: %s", url)
            await page.goto(url, wait_until="domcontentloaded", timeout=15_000)

            magic_keywords = ["primeiro vídeo", "primeiro resultado", "primeira música", "primeiro thumbnail"]
            if any(k in element_text.lower() for k in magic_keywords):
                logger.info("[BrowserControl] Tentando clicar no primeiro resultado/thumbnail com mágica.")
                await asyncio.sleep(3)
                if "youtube.com" in url:
                    locator = page.locator("ytd-thumbnail a#thumbnail, a#video-title").first
                elif "spotify.com" in url:
                    locator = page.locator("div[data-testid='tracklist-row'] button, button[data-testid='play-button']").first
                else:
                    locator = page.locator("a").nth(0)
            else:
                locator = page.get_by_text(element_text, exact=False).first

            await locator.wait_for(state="visible", timeout=10_000)
            await locator.click()

            logger.info("[BrowserControl] Clicou em '%s' com sucesso.", element_text)
            await asyncio.sleep(2)
            return f"Cliquei em '{element_text}' na página {url} com sucesso (via Chrome logado)."

        except PlaywrightTimeout:
            return f"Tempo esgotado ao tentar encontrar '{element_text}' na página. O elemento pode não estar visível."
        except Exception as e:
            logger.error("[BrowserControl] Erro ao clicar: %s", e)
            return f"Erro ao tentar clicar em '{element_text}': {str(e)}"
        finally:
            # Não fecha — o browser é o Chrome do usuário via CDP
            pass


def click_on_page(url: str, element_text: str) -> str:
    """Wrapper síncrono para uso no system_control. Roda em thread separada se já houver um event loop."""
    import concurrent.futures
    
    def _run():
        return asyncio.run(_click_on_page(url, element_text))

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(_run).result()
    else:
        return asyncio.run(_click_on_page(url, element_text))
