import { X } from "lucide-react";
import type { NotificationItem } from "@/types";

const LEVEL_COLOR = {
  info: "var(--cyan)",
  success: "var(--neon)",
  warning: "var(--violet)",
} as const;

export function NotificationCard({
  notification,
  onDismiss,
}: {
  notification: NotificationItem;
  onDismiss?: (id: string) => void;
}) {
  return (
    <div className="hud-panel relative flex gap-3 p-3">
      <span
        className="mt-1 size-2 shrink-0 rounded-full"
        style={{ background: LEVEL_COLOR[notification.level], boxShadow: `0 0 10px ${LEVEL_COLOR[notification.level]}` }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{notification.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{notification.description}</p>
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(notification.id)}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Dispensar notificação"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}