import asyncio
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.services import supabase_service

router = APIRouter()


@router.get("/reminders")
async def list_reminders(user: dict = Depends(get_current_user)):
    return await asyncio.to_thread(supabase_service.list_reminders, user["id"])


@router.patch("/reminders/{reminder_id}/notified")
async def mark_notified(reminder_id: str, user: dict = Depends(get_current_user)):
    await asyncio.to_thread(supabase_service.mark_reminder_notified, reminder_id)
    return {"status": "ok"}


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    await asyncio.to_thread(supabase_service.delete_reminder, user["id"], reminder_id)
    return {"status": "ok"}