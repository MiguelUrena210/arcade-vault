"use server";

import { headers } from "next/headers";
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
  over_email_send_rate_limit: "Demasiados correos enviados; espera un momento",
  signup_disabled: "El registro está desactivado",
  same_password: "La nueva contraseña debe ser distinta de la actual",
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

export async function signInWithProvider(provider: "google" | "github") {
  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    `${headerStore.get("x-forwarded-proto") ?? "http"}://${headerStore.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      // Google y GitHub muestran el selector de cuentas en cada intento.
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Introduce tu email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    return { error: authError(error.code, "No se pudo enviar el correo") };
  }

  return { message: "Revisa tu correo para restablecer la contraseña" };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "Contraseña demasiado débil (mínimo 6 caracteres)" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: authError(
        error.code,
        "No se pudo actualizar la contraseña; solicita un enlace nuevo",
      ),
    };
  }

  redirect("/games");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
