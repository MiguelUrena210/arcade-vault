import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Iniciar Sesión" };

async function LoginGate() {
  // getClaims() usa Date.now(); sin esto el validador de cacheComponents
  // lo detecta "en prerender" y bloquea la ruta.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/games");
  return <AuthForm />;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginGate />
    </Suspense>
  );
}
