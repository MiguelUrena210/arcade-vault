"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SaveScoreResult = { ok: true } | { ok: false; error: string };

export async function saveScore(
  gameId: number,
  initials: string,
  score: number,
): Promise<SaveScoreResult> {
  if (!Number.isInteger(gameId)) return { ok: false, error: "Juego inválido" };
  if (!/^[A-Z0-9_]{3,10}$/.test(initials)) {
    return { ok: false, error: "Iniciales: 3 a 10 caracteres A-Z, 0-9 o _" };
  }
  if (!Number.isInteger(score) || score < 0 || score > 1_000_000) {
    return { ok: false, error: "Puntuación fuera de rango" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, initials, score });
  if (error) return { ok: false, error: "No se pudo guardar la puntuación" };

  updateTag(`scores:${gameId}`);
  updateTag("scores");
  return { ok: true };
}
