import { useEffect, useRef, useCallback } from "react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useReminderStore } from "@/store/reminderStore";
import { useAuthStore } from "@/store/authStore";
import { usePluginStore } from "@/store/pluginStore";
import type { Reminder } from "@/types/reminder";

const FETCH_INTERVAL_MS = 60_000; // 1 minuto
const CHECK_INTERVAL_MS = 30_000; // 30 segundos
const PRE_ALERT_MINUTES = 10;     // aviso antecipado

/** Converte event_date + event_time em objeto Date no fuso local */
function reminderToDate(r: Reminder): Date {
  return new Date(`${r.event_date}T${r.event_time}`);
}

/** Formata horário legível: "14:00" */
function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** Gera fala natural e personalizada para o lembrete */
function buildSpeechText(r: Reminder, userName: string, isPreAlert: boolean): string {
  const time = formatTime(r.event_time);

  if (isPreAlert) {
    // Aviso antecipado: "Lenildo, com licença, sua consulta começa em 10 minutos!"
    let text = `${userName}, com licença. `;
    text += `Estou avisando que "${r.title}" começa em ${PRE_ALERT_MINUTES} minutos, às ${time}`;
    if (r.location) {
      text += `, em ${r.location}`;
    }
    text += `. Se prepare!`;
    return text;
  }

  // Alerta na hora exata: "Lenildo, é agora! Sua consulta está começando."
  let text = `${userName}, é agora! `;
  text += `"${r.title}" está começando`;
  if (r.location) {
    text += `, em ${r.location}`;
  }
  text += `.`;
  return text;
}

export function useReminderAlerts() {
  const token = useAuthStore((s) => s.accessToken);
  const userName = useAuthStore((s) => s.user?.name) || "Comandante";
  const isCalendarEnabled = usePluginStore((s) => s.isPluginEnabled("plg_cal"));
  const { speak } = useTextToSpeech();
  const { loadReminders, markNotified, addAlert } = useReminderStore();

  // Fila de TTS para não sobrepor falas
  const ttsQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Evita marcar o mesmo lembrete duas vezes
  const processingIds = useRef<Set<string>>(new Set());
  // IDs de lembretes que já receberam o pré-alerta de 10 min
  const preAlertedIds = useRef<Set<string>>(new Set());

  const checkAndAlert = useCallback(() => {
    const now = new Date();
    const reminders = useReminderStore.getState().reminders;

    for (const r of reminders) {
      if (r.notified || processingIds.current.has(r.id)) continue;

      const eventDate = reminderToDate(r);
      const diffMs = eventDate.getTime() - now.getTime();
      const diffMin = diffMs / 60_000;

      // Pré-alerta: faltam ~10 minutos (entre 9.5 e 10.5 min para a janela de 30s)
      if (
        diffMin > 0 &&
        diffMin <= PRE_ALERT_MINUTES + 0.5 &&
        diffMin >= PRE_ALERT_MINUTES - 0.5 &&
        !preAlertedIds.current.has(r.id)
      ) {
        preAlertedIds.current.add(r.id);

        // Toast visual de pré-aviso
        addAlert({
          id: `pre_${r.id}`,
          title: `⏰ ${r.title} em ${PRE_ALERT_MINUTES} min`,
          location: r.location,
          event_time: r.event_time,
          event_date: r.event_date,
        });

        // Fala natural de aviso antecipado
        const speechText = buildSpeechText(r, userName, true);
        ttsQueueRef.current = ttsQueueRef.current.then(async () => {
          try {
            await speak(speechText);
          } catch (err) {
            console.error("[ReminderAlerts] TTS pre-alert error:", err);
          }
        });
      }

      // Alerta na hora exata: já venceu
      if (diffMs <= 0) {
        processingIds.current.add(r.id);

        // Apenas alerta visual/sonoro se passou no máximo 15 minutos (evita spam no startup)
        if (diffMin >= -15) {
          // Toast visual
          addAlert({
            id: r.id,
            title: r.title,
            location: r.location,
            event_time: r.event_time,
            event_date: r.event_date,
          });

          // Fala natural na hora exata
          const speechText = buildSpeechText(r, userName, false);
          ttsQueueRef.current = ttsQueueRef.current.then(async () => {
            try {
              await speak(speechText);
            } catch (err) {
              console.error("[ReminderAlerts] TTS error:", err);
            }
          });
        }

        // Marcar como notificado
        void markNotified(token, r.id).finally(() => {
          processingIds.current.delete(r.id);
        });
      }
    }
  }, [token, userName, speak, addAlert, markNotified]);

  // Fetch periódico — para quando o plugin estiver desativado
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
    // Checar imediatamente ao montar
    checkAndAlert();
    return () => clearInterval(checkTimer);
  }, [isCalendarEnabled, checkAndAlert]);
}
