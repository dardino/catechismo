"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/iscritti");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !process.env.SESSION_SECRET) {
    return { error: "Configurazione auth mancante (ADMIN_PASSWORD/SESSION_SECRET)" };
  }
  if (password !== expected) {
    return { error: "Password non valida" };
  }
  await setSessionCookie();
  redirect(next.startsWith("/") ? next : "/iscritti");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
