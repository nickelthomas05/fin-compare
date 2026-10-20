"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Creds = z.object({ email: z.email(), password: z.string().min(8, "Password must be at least 8 characters") });

const safeNext = (n: FormDataEntryValue | null) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function authenticate(_: string | null, form: FormData): Promise<string | null> {
  const parsed = Creds.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return parsed.error.issues[0].message;

  const supabase = await createClient();
  const mode = form.get("mode");
  if (mode === "signup") {
    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
    const { data, error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${origin}/` } });
    if (error) return error.message;
    if (!data.session) return "Check your email to confirm your account, then sign in.";
  } else {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return error.message;
  }
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
