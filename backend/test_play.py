import sys
import asyncio
from pathlib import Path
sys.path.insert(0, str(Path(r"d:\Projetos_programacao\jarvis-ai\backend")))

from app.services import spotify_service
from app.services import supabase_service
import logging

logging.basicConfig(level=logging.INFO)

async def main():
    tokens = supabase_service._client.table("spotify_tokens").select("*").execute()
    if not tokens.data:
        print("Nenhuma conta do spotify vinculada.")
        return
        
    user_id = tokens.data[0]["user_id"]
    print(f"Testando play com user_id: {user_id}")
    
    result = await spotify_service.play_spotify(user_id, "Tomara Pablo")
    print(f"Resultado FINAL: {result}")
        
if __name__ == "__main__":
    asyncio.run(main())
