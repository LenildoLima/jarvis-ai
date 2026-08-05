import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Network, Fingerprint, Mail, KeyRound, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabaseClient";

export function LoginPage() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: "/" });
    }
  }, [user, isLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) return;
    
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { display_name: name }
          }
        });
        if (err) throw err;
        
        if (data.user && !data.session) {
           setError("Cadastro realizado! Verifique sua caixa de e-mail para confirmar a conta.");
           setLoading(false);
           return;
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message || "Erro desconhecido";
      
      if (msg.includes("Invalid login credentials")) msg = "E-mail ou senha incorretos / inválidos.";
      else if (msg.includes("User already registered")) msg = "Este e-mail já está em uso por outro usuário.";
      else if (msg.includes("Password should be at least 6 characters")) msg = "A senha deve ter pelo menos 6 caracteres.";
      else if (msg.includes("weak")) msg = "A senha é muito fraca. Tente uma mais forte.";
      else if (msg.toLowerCase().includes("email not confirmed")) msg = "Você precisa confirmar seu e-mail antes de logar. Verifique sua caixa de entrada.";
      else if (msg.includes("invalid password") || msg.toLowerCase().includes("senha")) msg = "Senha inválida ou incorreta.";
      
      setError(msg);
      setLoading(false);
    }
  }

  // Hide page content until initial auth check resolves,
  // to avoid flashing the login screen for already logged in users.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-cyan" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hud-panel relative z-10 w-full max-w-md p-8 backdrop-blur-xl bg-background/50 border border-cyan/20"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4 flex size-16 items-center justify-center rounded-full bg-cyan/10">
            <Network className="size-8 text-cyan" />
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan/30"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <h1 className="font-display text-2xl tracking-widest text-glow">
            {mode === "login" ? "AUTENTICAÇÃO" : "INICIALIZAÇÃO"}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground uppercase tracking-widest">
            {mode === "login"
              ? "Identifique-se para acessar o núcleo"
              : "Estabeleça uma nova conexão neural"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan/70" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome de acesso (ex: Comandante)"
                    className="h-11 border-cyan/30 bg-black/40 pl-10 text-sm focus-visible:ring-cyan/50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan/70" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Endereço neural (E-mail)"
                className="h-11 border-cyan/30 bg-black/40 pl-10 text-sm focus-visible:ring-cyan/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan/70" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Código de segurança (Senha)"
                className="h-11 border-cyan/30 bg-black/40 pl-10 text-sm focus-visible:ring-cyan/50"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500"
              >
                <Fingerprint className="size-4 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={loading || !email || !password || (mode === "signup" && !name)}
            className="h-11 w-full bg-cyan text-black hover:bg-cyan/90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "login" ? (
              "ESTABELECER CONEXÃO"
            ) : (
              "INICIAR REGISTRO"
            )}
          </Button>
        </form>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-cyan"
          >
            {mode === "login"
              ? "Não possui acesso? Solicitar registro."
              : "Já possui acesso? Estabeleça conexão."}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
