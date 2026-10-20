"use client";

import { useActionState, useState } from "react";
import { authenticate } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, action, pending] = useActionState(authenticate, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="email" className="input mt-1" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="input mt-1"
        />
      </label>
      {message && <p className="text-sm text-warn">{message}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-xs text-muted">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button type="button" className="text-cyan hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
