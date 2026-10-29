import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Iniciar Sesión" };

async function LoginGate() {
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
