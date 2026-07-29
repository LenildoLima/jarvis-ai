import { cn } from "@/lib/utils";

export function LoadingSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg border border-border/60 bg-secondary/30"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}