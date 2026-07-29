import { delay, mockUser } from "@/mock/data";
import type { User } from "@/types";

export interface AuthService {
  signIn(email: string, password: string): Promise<User>;
  signUp(name: string, email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  getUser(): Promise<User | null>;
}

export const authService: AuthService = {
  async signIn(email) {
    await delay(700);
    return { ...mockUser, email };
  },
  async signUp(name, email) {
    await delay(800);
    return { ...mockUser, name, email };
  },
  async signOut() {
    await delay(200);
  },
  async getUser() {
    await delay(200);
    return mockUser;
  },
};