import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <div className="ring-glow flex size-12 items-center justify-center rounded-full bg-secondary/40">
        <Icon className="size-5 text-primary" />
      </div>
      <h3 className="font-display text-sm tracking-wide">{title}</h3>
      <p className="max-w-[24ch] text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}