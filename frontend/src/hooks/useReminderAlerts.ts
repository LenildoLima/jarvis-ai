import { useEffect, useRef, useCallback } from "react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useReminderStore } from "@/store/reminderStore";
import { useAuthStore } from "@/store/authStore";
import { usePluginStore } from "@/store/pluginStore";
import type { Reminder } from "@/types/reminder";

const FETCH_INTERVAL_MS = 60_000; // 1 minuto
const CHECK_INTERVAL_MS = 30_000; // 30 segundos

/** Converte event_date + event_time em objeto Date no fuso local */
function reminderToDate(r: Reminder): Date {
  // "2026-08-15" + "14:00:00" → "2026-08-15T14:00:00"
  return new Date(`${r.event_date}T${r.event_time}`);
}

/** Formata mensagem de voz do lembrete */
function buildSpeechText(r: Reminder): string {
  const parts = [`Lembrete: ${r.title}, agora`];
  if (r.location) {
    parts.push(`no ${r.location}`);
  }
  return parts.join(", ") + ".";
}

export function useReminderAlerts() {
  const token = useAuthStore((s) => s.accessToken);
  const isCalendarEnabled = usePluginStore((s) => s.isPluginEnabled("plg_cal"));
  const { speak } = useTextToSpeech();
  const { loadReminders, markNotified, addAlert } = useReminderStore();

  // Fila de TTS para não sobrepor falas
  const ttsQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Evita marcar o mesmo lembrete duas vezes enquanto o PATCH ainda está em andamento
  const processingIds = useRef<Set<string>>(new Set());

  const checkAndAlert = useCallback(() => {
    const now = new Date();
    const reminders = useReminderStore.getState().reminders;
    const due = reminders.filter(
      (r) => !r.notified && !processingIds.current.has(r.id) && reminderToDate(r) <= now
    );

    for (const r of due) {
      processingIds.current.add(r.id);

      // Adicionar alerta visual imediatamente
      addAlert({
        id: r.id,
        title: r.title,
        location: r.location,
        event_time: r.event_time,
        event_date: r.event_date,
      });

      // Enfileirar TTS (não sobrepõe falas)
      const speechText = buildSpeechText(r);
      ttsQueueRef.current = ttsQueueRef.current.then(async () => {
        try {
          await speak(speechText);
        } catch (err) {
          console.error("[ReminderAlerts] TTS error:", err);
        }
      });

      // Marcar como notificado no backend e no store
      void markNotified(token, r.id).finally(() => {
        processingIds.current.delete(r.id);
      });
    }
  }, [token, speak, addAlert, markNotified]);

  // Fetch periódico da lista — para quando o plugin estiver desativado
  useEffect(() => {
    if (!token || !isCalendarEnabled) return;

    void loadReminders(token);
    const fetchTimer = setInterval(() => void loadReminders(token), FETCH_INTERVAL_MS);
    return () => clearInterval(fetchTimer);
  }, [token, isCalendarEnabled, loadReminders]);

  // Verificador periódico de alertas — para quando o plugin estiver desativado
  useEffect(() => {
    if (!isCalendarEnabled) return;

    const checkTimer = setInterval(checkAndAlert, CHECK_INTERVAL_MS);
    // Checar imediatamente ao montar para pegar lembretes já vencidos
    checkAndAlert();
    return () => clearInterval(checkTimer);
  }, [isCalendarEnabled, checkAndAlert]);
}
