# Backend — Nova Core

API em FastAPI que serve a Nova (chat via Groq com streaming, e status do sistema em tempo real).

## Setup

```bash
# 1. Criar e ativar ambiente virtual
python -m venv .venv
.venv\Scripts\activate        # Windows (PowerShell/cmd)

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Configurar variáveis de ambiente
copy .env.example .env
# edite o .env e coloque sua GROQ_API_KEY

# 4. Rodar o servidor
uvicorn app.main:app --reload --port 8000
```

Com o servidor rodando, acesse:
- `http://localhost:8000` — healthcheck
- `http://localhost:8000/docs` — documentação automática (Swagger)

## Estrutura

```
app/
  main.py               # ponto de entrada, monta as rotas e o CORS
  routers/
    chat.py              # WebSocket /ws/chat — streaming das respostas da Nova
    system.py            # WebSocket /ws/system-stats — métricas da máquina
    conversations.py     # REST /conversations — CRUD (em memória por enquanto)
  services/
    groq_service.py       # integração com a Groq (troque aqui para GPT/Claude no futuro)
    system_monitor.py      # coleta CPU/RAM/disco/rede/GPU/temperatura via psutil
  models/
    chat.py                # schemas Pydantic do chat
    system.py               # schema Pydantic das métricas
  core/
    config.py                # variáveis de ambiente centralizadas
```

## Próximos passos (pendências conhecidas)

- **GPU**: não lida pelo `psutil`. Para GPUs NVIDIA, instalar `nvidia-ml-py` e usar `pynvml` (já preparado em `system_monitor.py`, só ativar).
- **Temperatura no Windows**: `psutil.sensors_temperatures()` não funciona no Windows. Vai precisar de `wmi` + LibreHardwareMonitor/OpenHardwareMonitor rodando em background.
- **Persistência**: conversas e histórico estão em memória (somem ao reiniciar o servidor). Trocar por Supabase quando estiver pronto — a interface dos routers já foi pensada para isso não exigir mudanças no frontend.
