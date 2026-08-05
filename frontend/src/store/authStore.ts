import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
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

export const useAuthStore = create<AuthState>((set) => {
  // Initialize session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      set({
        user: mapSupabaseUser(session.user),
        accessToken: session.access_token,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  });

  // Listen for changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      set({
        user: mapSupabaseUser(session.user),
        accessToken: session.access_token,
        isLoading: false,
      });
    } else {
      set({ user: null, accessToken: null, isLoading: false });
    }
  });

  return {
    user: null,
    accessToken: null,
    isLoading: true, // starts true until first getsession
    logout: async () => {
      await supabase.auth.signOut();
      set({ user: null, accessToken: null, isLoading: false });
    },
  };
});
