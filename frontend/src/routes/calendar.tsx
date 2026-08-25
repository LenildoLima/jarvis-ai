import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { CalendarDays, CalendarOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ReminderCard } from "@/features/calendar/ReminderCard";
import { useReminderStore } from "@/store/reminderStore";
import { useAuthStore } from "@/store/authStore";
import { usePluginStore } from "@/store/pluginStore";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendário — BELL" },
      { name: "description", content: "Seus lembretes e compromissos gerenciados pela Bell." },
      { property: "og:title", content: "Calendário — BELL" },
      { property: "og:description", content: "Lembretes e agenda do assistente pessoal." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { user, isLoading: authLoading, accessToken } = useAuthStore();
  const { reminders, loadReminders, removeReminder } = useReminderStore();
  const { isPluginEnabled } = usePluginStore();
  const isEnabled = isPluginEnabled("plg_cal");
  const isLoading = reminders.length === 0 && authLoading;

  useEffect(() => {
    if (accessToken && isEnabled) {
      void loadReminders(accessToken);
    }
  }, [accessToken, isEnabled, loadReminders]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" />;

  // Sort: não-notificados e futuros primeiro, depois notificados/passados
  const sorted = useMemo(() => {
    return [...reminders].sort((a, b) => {
      const da = new Date(`${a.event_date}T${a.event_time}`);
      const db = new Date(`${b.event_date}T${b.event_time}`);
      return da.getTime() - db.getTime();
    });
  }, [reminders]);

  const handleDelete = async (id: string) => {
    await removeReminder(accessToken, id);
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-8">
        {/* Header */}
        <h1 className="font-display text-2xl">Calendário</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus lembretes criados durante as conversas com a Bell.
        </p>

        <div className="mt-6">
          {!isEnabled ? (
            <EmptyState
              icon={CalendarOff}
              title="Calendário desativado"
              description="Ative o plugin em Configurações > Plugins para ver e gerenciar seus lembretes."
            />
          ) : isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum lembrete"
              description="Peça à Bell para criar um lembrete durante uma conversa, por exemplo: «marca uma consulta sexta às 15h»."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {sorted.map((reminder, i) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onDelete={handleDelete}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
