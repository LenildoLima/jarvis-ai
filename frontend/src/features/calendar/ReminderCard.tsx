import { motion } from "motion/react";
import { CalendarDays, Clock, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types/reminder";

interface ReminderCardProps {
  reminder: Reminder;
  onDelete: (id: string) => Promise<void>;
  index?: number;
}

function formatDate(date: string): string {
  // "2026-08-15" → "15/08/2026"
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(time: string): string {
  // "14:00:00" → "14:00"
  return time.slice(0, 5);
}

function isPast(date: string, time: string): boolean {
  return new Date(`${date}T${time}`) < new Date();
}

export function ReminderCard({ reminder, onDelete, index = 0 }: ReminderCardProps) {
  const [deleting, setDeleting] = useState(false);
  const past = isPast(reminder.event_date, reminder.event_time);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(reminder.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        "group relative rounded-xl border bg-secondary/20 p-4 backdrop-blur-sm transition-all",
        "hover:border-border hover:bg-secondary/30",
        past
          ? "border-border/40 opacity-60"
          : reminder.notified
            ? "border-border/50"
            : "border-neon/30 shadow-[0_0_18px_-6px_var(--neon)]"
      )}
    >
      {/* Status dot */}
      <span
        className={cn(
          "absolute right-4 top-4 size-2 rounded-full",
          past
            ? "bg-muted-foreground"
            : reminder.notified
              ? "bg-cyan"
              : "animate-pulse bg-neon shadow-glow"
        )}
        title={past ? "Passado" : reminder.notified ? "Notificado" : "Pendente"}
      />

      {/* Title */}
      <p className="pr-6 font-display text-sm font-semibold text-foreground leading-snug">
        {reminder.title}
      </p>

      {/* Meta */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0 text-neon/70" />
          {formatDate(reminder.event_date)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0 text-neon/70" />
          {formatTime(reminder.event_time)}
        </span>
        {reminder.location && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-neon/70" />
            {reminder.location}
          </span>
        )}
      </div>

      {/* Notes (optional) */}
      {reminder.notes && (
        <p className="mt-2.5 text-xs text-muted-foreground italic leading-relaxed">
          {reminder.notes}
        </p>
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={cn(
          "absolute bottom-3.5 right-3.5 flex size-7 items-center justify-center rounded-lg text-muted-foreground",
          "opacity-0 group-hover:opacity-100 transition-all",
          "hover:bg-destructive/20 hover:text-destructive",
          deleting && "opacity-100 animate-pulse"
        )}
        aria-label="Remover lembrete"
        title="Remover lembrete"
      >
        <Trash2 className="size-3.5" />
      </button>
    </motion.div>
  );
}
