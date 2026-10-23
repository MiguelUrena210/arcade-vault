import { cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Game } from "@/lib/game-types";

export { CATS } from "@/lib/game-types";
export type { Game, GameCategory, GameColor } from "@/lib/game-types";

export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheTag("games", "scores");

  const supabase = createPublicClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("game_stats").select("*"),
  ]);
  if (games.error) throw games.error;
  if (stats.error) throw stats.error;

  const byGame = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((g) => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    short: g.short,
    long: g.long,
    cat: g.cat,
    cover: g.cover as Game["cover"],
    color: g.color,
    savesScores: g.saves_scores,
    best: byGame.get(g.id)?.best ?? null,
    plays: byGame.get(g.id)?.plays ?? 0,
  }));
}

export async function getGame(slug: string): Promise<Game | undefined> {
  return (await getGames()).find((g) => g.slug === slug);
}
