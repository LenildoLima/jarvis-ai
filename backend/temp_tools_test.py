import asyncio
import sys

sys.path.append(r"d:\Projetos_programacao\jarvis-ai\backend")
from app.core.config import settings
from app.services.groq_service import _TOOLS, _build_system_prompt
from groq import AsyncGroq

async def main():
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    system_prompt = _build_system_prompt("Comandante")
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": "[Imagem anexada]"}]
    
    tool_choice = {"type": "function", "function": {"name": "analyze_image"}}
    
    try:
        res = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            tools=_TOOLS,
            tool_choice=tool_choice,
            stream=False,
        )
        print("Success!")
        print(res.choices[0].message)
    except Exception as e:
        print("Error during create:", e)

if __name__ == "__main__":
    asyncio.run(main())
