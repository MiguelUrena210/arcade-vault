"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { displayNameFrom, initialsFrom } from "@/lib/user-name";

type SaveScoreResult = { ok: true } | { ok: false; error: string };

export async function saveScore(
  gameId: number,
  initials: string,
  score: number,
): Promise<SaveScoreResult> {
  if (!Number.isInteger(gameId)) return { ok: false, error: "Juego inválido" };
  if (!Number.isInteger(score) || score < 0 || score > 1_000_000) {
    return { ok: false, error: "Puntuación fuera de rango" };
  }

  const supabase = await createClient();

  // Con sesión, la identidad se deriva en servidor: las iniciales que llegan
  // del cliente se ignoran y se guarda user_id + snapshot del display name.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const displayName = claims
    ? displayNameFrom({
        email: typeof claims.email === "string" ? claims.email : undefined,
        user_metadata: claims.user_metadata as
          Record<string, unknown> | undefined,
      })
    : null;

  let row;
  if (claims && displayName) {
    row = {
      game_id: gameId,
      initials: initialsFrom(displayName),
      score,
      user_id: claims.sub,
      display_name: displayName.slice(0, 40),
    };
  } else {
    if (!/^[A-Z0-9_]{3,10}$/.test(initials)) {
      return { ok: false, error: "Iniciales: 3 a 10 caracteres A-Z, 0-9 o _" };
    }
    row = { game_id: gameId, initials, score };
  }

  const { error } = await supabase.from("scores").insert(row);
  if (error) return { ok: false, error: "No se pudo guardar la puntuación" };

  updateTag(`scores:${gameId}`);
  updateTag("scores");
  return { ok: true };
}
