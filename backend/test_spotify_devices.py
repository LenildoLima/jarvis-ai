import sys
import asyncio
from pathlib import Path
sys.path.insert(0, str(Path(r"d:\Projetos_programacao\jarvis-ai\backend")))

from app.services import spotify_service
from app.services import supabase_service

async def main():
    # Encontrar os registros de tokens de spotify
    tokens = supabase_service._client.table("spotify_tokens").select("*").execute()
    if not tokens.data:
        print("Nenhuma conta do spotify vinculada.")
        return
        
    for token_record in tokens.data:
        user_id = token_record["user_id"]
        print(f"Testando com user_id: {user_id}")
        
        access_token = await spotify_service._get_valid_access_token(user_id)
        if not access_token:
            print("  Falha ao obter access token para o user", user_id)
            continue

        print("  Access token válido. Checando dispositivos...")
        import httpx
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://api.spotify.com/v1/me/player/devices",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            print(f"  Status /devices: {res.status_code}")
            print(f"  Resposta /devices: {res.json()}")
        
if __name__ == "__main__":
    asyncio.run(main())
