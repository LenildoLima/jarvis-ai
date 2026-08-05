import { useEffect } from "react";
import { useContinuousListening } from "@/hooks/useContinuousListening";

export function WakeWordManager({ onSubmit }: { onSubmit: (text: string) => void }) {
  // Inicializa o hook invisivelmente em background
  useContinuousListening(onSubmit);
  return null;
}
