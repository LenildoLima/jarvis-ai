import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/LoginPage";

export const Route = createFileRoute("/auth")({
  beforeLoad: ({ context }) => {
    // We assume context comes from a router with auth context eventually if needed
    // But we'll handle the redirect inside the index file or via store check here
  },
  loader: () => {
    // Actually, in a Tanstack Router with Zustand, we can just check the store
    // Or we handle it directly in the component. For simplicity and since we don't
    // have context set up in __root to inject Zustand, we'll let index.tsx handle
    // the unauthenticated redirect, and LoginPage will redirect if already auth'd.
  },
  component: LoginPage,
});
