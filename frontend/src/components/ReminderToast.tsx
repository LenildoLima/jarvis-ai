import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, MapPin, X } from "lucide-react";
import { useReminderStore, type ReminderAlert } from "@/store/reminderStore";
import { cn } from "@/lib/utils";

function formatTime(time: string): string {
  // "14:00:00" → "14:00"
  return time.slice(0, 5);
}

function formatDate(date: string): string {
  // "2026-08-15" → "15/08"
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

interface AlertCardProps {
  alert: ReminderAlert;
  onDismiss: (id: string) => void;
}

function AlertCard({ alert, onDismiss }: AlertCardProps) {
  // Auto-dismiss após 10s
  useEffect(() => {
    const t = setTimeout(() => onDismiss(alert.id), 10_000);
    return () => clearTimeout(t);
  }, [alert.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.88 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "relative w-80 rounded-xl border border-neon/30 bg-background/80 p-4 shadow-2xl backdrop-blur-xl",
        "before:absolute before:inset-0 before:rounded-xl before:bg-neon/5 before:pointer-events-none"
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neon/20 ring-1 ring-neon/40">
          <Bell className="size-4 text-neon animate-pulse" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-widest text-neon/80">
            Lembrete
          </p>
          <p className="mt-0.5 font-display text-sm font-semibold text-foreground leading-tight truncate">
            {alert.title}
          </p>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          aria-label="Fechar alerta"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Details */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-12">
        <span className="text-xs text-muted-foreground">
          {formatDate(alert.event_date)} às {formatTime(alert.event_time)}
        </span>
        {alert.location && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {alert.location}
          </span>
        )}
      </div>

      {/* Progress bar (auto-dismiss visual) */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] rounded-b-xl bg-neon/60"
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 10, ease: "linear" }}
      />
    </motion.div>
  );
}

export function ReminderToast() {
  const pendingAlerts = useReminderStore((s) => s.pendingAlerts);
  const dismissAlert = useReminderStore((s) => s.dismissAlert);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
      aria-label="Alertas de lembretes"
    >
      <AnimatePresence>
        {pendingAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
        ))}
      </AnimatePresence>
    </div>
  );
}
