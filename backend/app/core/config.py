from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configurações centrais do backend, carregadas do arquivo .env.
    Nunca hardcode chaves/URLs no código — sempre via variáveis de ambiente.
    """

    # Groq (provedor de IA inicial do chat)
    GROQ_API_KEY: str
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # Tavily (busca real na web, usada via function calling)
    TAVILY_API_KEY: str

    # CORS — endereço onde o frontend roda localmente
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Intervalo de atualização das métricas do sistema (segundos)
    SYSTEM_STATS_INTERVAL: float = 2.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()