import { cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

export async function getTopScores(
  gameId: number,
  limit = 10,
): Promise<ScoreRow[]> {
  "use cache";
  cacheTag(`scores:${gameId}`);

  const { data, error } = await createPublicClient()
    .from("scores")
    .select("initials, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  return data.map((r, i) => ({
    rank: i + 1,
    name: r.initials,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}
