"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string; // mensaje de error a pintar en el form
  message?: string; // p. ej. «Revisa tu correo para confirmar la cuenta»
};

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos",
  email_not_confirmed: "Confirma tu correo antes de entrar",
  user_already_exists: "Ya existe una cuenta con ese correo",
  email_exists: "Ya existe una cuenta con ese correo",
  weak_password: "Contraseña demasiado débil (mínimo 6 caracteres)",
  over_request_rate_limit: "Demasiados intentos; espera un momento",
  signup_disabled: "El registro está desactivado",
};

function authError(code: string | undefined, fallback: string) {
  return AUTH_ERRORS[code ?? ""] ?? fallback;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Introduce email y contraseña" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { error: authError(error.code, "No se pudo iniciar sesión") };
  }

  redirect("/games");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const displayName = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!displayName || !email || !password) {
    return { error: "Introduce usuario, email y contraseña" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) {
    return { error: authError(error.code, "No se pudo crear la cuenta") };
  }

  return { message: "Revisa tu correo para confirmar la cuenta" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
