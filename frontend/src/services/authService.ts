import { supabase } from "@/lib/supabaseClient";
import type { User } from "@/types";

export interface AuthService {
  signIn(email: string, password: string): Promise<User>;
  signUp(name: string, email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  getUser(): Promise<User | null>;
}

function mapSupabaseUser(u: any): User {
  return {
    id: u.id,
    name: u.user_metadata?.display_name || u.email || "Usuário",
    email: u.email || "",
    avatarUrl: u.user_metadata?.avatar_url || null,
    createdAt: u.created_at,
  };
}

export const authService: AuthService = {
  async signIn(email, password) {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!user) throw new Error("A autenticação falhou");
    return mapSupabaseUser(user);
  },
  async signUp(name, email, password) {
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } }
    });
    if (error) throw error;
    if (!user) throw new Error("A autenticação falhou");
    return mapSupabaseUser(user);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return mapSupabaseUser(user);
  },
};