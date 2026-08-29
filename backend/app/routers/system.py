import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.config import settings
from app.services.system_monitor import get_system_stats

router = APIRouter()


@router.websocket("/ws/system-stats")
async def system_stats_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            stats = await asyncio.to_thread(get_system_stats, settings.SYSTEM_STATS_INTERVAL)
            await websocket.send_json(stats.model_dump())
            await asyncio.sleep(settings.SYSTEM_STATS_INTERVAL)
    except WebSocketDisconnect:
        pass
