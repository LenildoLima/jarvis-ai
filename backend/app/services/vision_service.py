from groq import AsyncGroq
from app.core.config import settings

_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

VISION_MODEL = "qwen/qwen3.6-27b"


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