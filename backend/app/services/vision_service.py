from groq import AsyncGroq
from app.core.config import settings
import cv2
import base64
import logging

_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

VISION_MODEL = "qwen/qwen3.6-27b"
logger = logging.getLogger(__name__)


async def analyze_image(image_base64: str, question: str) -> str:
    """
    Envia uma imagem (em base64) + uma pergunta para o modelo de visão
    da Groq (Qwen 3.6 27B), o único dos nossos modelos capaz de
    "enxergar" imagens. O modelo principal (gpt-oss-120b) é só texto —
    ele nunca recebe a imagem diretamente, só o resultado em texto que
    essa função retorna.
    """
    try:
        response = await _client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": question},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            },
                        },
                    ],
                }
            ],
        )
        return response.choices[0].message.content or "Não consegui interpretar a imagem."
    except Exception as exc:
        return f"Erro ao analisar a imagem: {exc}"

async def capture_webcam_and_analyze(question: str) -> str:
    """
    Liga a webcam padrão temporariamente, captura uma imagem e
    usa o modelo de visão para respondê-la, reproduzindo a resposta textualmente.
    """
    logger.info("Tentando capturar imagem da webcam (indice 0)...")
    try:
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            return "Erro: Não foi possível acessar a webcam."
        
        # Opcional: descartar os primeiros frames para ajuste de luminosidade da câmera
        for _ in range(5):
            cap.read()
            
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            return "Erro: Falha ao ler um quadro (frame) da webcam."
            
        # Converter imagem do BGR OpenCv para RGB (opcional) ou direito pra JPEG
        success, buffer = cv2.imencode('.jpg', frame)
        if not success:
            return "Erro: Falha ao codificar a imagem (JPEG)."
            
        # Converter pra Base64
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        logger.info("Imagem da webcam capturada, enviando para analyze_image...")
        
        # Envelopa a pergunta com regras pesadas para o modelo não parecer robótico
        prompt_natural = (
            "Você é a visão da assistente Bell. Você está olhando a webcam do usuário em TEMPO REAL. "
            "REGRA DE OURO: NUNCA diga 'na imagem', 'na foto', 'estou vendo uma imagem com'. "
            "NUNCA se refira ao usuário na terceira pessoa (ex: 'a pessoa está segurando'). "
            "Responda diretamente e de forma natural sobre a cena, tratando o humano que você vê como 'você' "
            "(ex: 'Você está segurando uma lata...'). "
            f"\n\nO que foi perguntado: {question}"
        )
        
        # Reutiliza o método existente enviando o base64
        resultado = await analyze_image(image_base64, prompt_natural)
        return resultado
    except Exception as exc:
        logger.error(f"Excecao na captura da webcam: {exc}")
        return f"Erro interno ao tentar processar a webcam: {exc}"