import { useEffect } from "react";
import { motion } from "motion/react";
import { MessagesSquare, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";

export function ConversationList() {
  const { conversations, activeId, query, loadingConversations } = useChatStore();
  const setQuery = useChatStore((s) => s.setQuery);
  const load = useChatStore((s) => s.loadConversations);
  const select = useChatStore((s) => s.selectConversation);
  const create = useChatStore((s) => s.newConversation);

  useEffect(() => {
    const id = setTimeout(() => void load(), 200);
    return () => clearTimeout(id);
  }, [query, load]);

  return (
    <div className="flex h-full flex-col gap-3 border-r border-border/60 bg-sidebar/30 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Conversas
        </h2>
        <Button size="sm" variant="secondary" className="h-7 gap-1 px-2 text-[11px]" onClick={() => void create()}>
          <Plus className="size-3" /> Nova
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar..."
          className="h-9 border-border/60 bg-secondary/30 pl-8 text-xs"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loadingConversations ? (
          <LoadingSkeleton rows={5} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Nenhuma conversa"
            description="Inicie uma nova conversa para começar."
          />
        ) : (
          conversations.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => void select(c.id)}
              className={cn(
                "w-full rounded-lg border border-transparent p-3 text-left transition-all hover:border-border hover:bg-secondary/40",
                activeId === c.id && "border-primary/40 bg-primary/10",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">{c.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {new Date(c.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{c.preview}</p>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}