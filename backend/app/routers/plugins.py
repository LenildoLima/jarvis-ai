import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.services import supabase_service

router = APIRouter()


class PluginToggle(BaseModel):
    enabled: bool


@router.get("/plugins")
async def list_plugins(user: dict = Depends(get_current_user)):
    return await asyncio.to_thread(supabase_service.list_plugins, user["id"])


@router.patch("/plugins/{plugin_key}")
async def toggle_plugin(
    plugin_key: str, body: PluginToggle, user: dict = Depends(get_current_user)
):
    if plugin_key not in supabase_service.DEFAULT_PLUGINS:
        raise HTTPException(status_code=404, detail="Plugin desconhecido")
    await asyncio.to_thread(supabase_service.set_plugin_enabled, user["id"], plugin_key, body.enabled)
    return {"plugin_key": plugin_key, "enabled": body.enabled}