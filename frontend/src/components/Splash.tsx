import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { APP_NAME, APP_TAGLINE, BOOT_SEQUENCE } from "@/config/env";
import { AIOrb } from "@/components/AIOrb";

export function Splash({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= BOOT_SEQUENCE.length) {
      const id = setTimeout(onDone, 600);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 700 : 520);
    return () => clearTimeout(id);
  }, [step, onDone]);

  return (
    <motion.div
      className="relative flex h-screen flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.5 }}
    >
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <AIOrb size={260} showLabel={false} />
      <h1 className="mt-8 font-display text-4xl tracking-[0.5em] text-glow">{APP_NAME}</h1>
      <p className="mt-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">{APP_TAGLINE}</p>

      <div className="mt-10 h-24 w-[320px] space-y-1.5">
        <AnimatePresence initial={false}>
          {BOOT_SEQUENCE.slice(0, step).map((line) => (
            <motion.p
              key={line}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-mono text-[11px] text-muted-foreground"
            >
              <span className="text-cyan">›</span> {line}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      <div className="h-px w-[320px] overflow-hidden bg-border">
        <motion.div
          className="h-full bg-cyan"
          initial={{ width: "0%" }}
          animate={{ width: `${(step / BOOT_SEQUENCE.length) * 100}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}