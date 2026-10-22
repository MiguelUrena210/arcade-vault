import type { Metadata } from "next";
import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/games";
import { getTopScores } from "@/lib/scores";

export const metadata: Metadata = { title: "Salón de la Fama" };

async function Hall({
  searchParams,
}: {
  searchParams: PageProps<"/hall-of-fame">["searchParams"];
}) {
  const { game } = await searchParams;
  const games = await getGames();
  const current =
    games.find((g) => typeof game === "string" && g.slug === game) ?? games[0];
  const rows = await getTopScores(current.id);
  return <HallOfFame gameId={current.slug} games={games} rows={rows} />;
}

export default function HallOfFamePage({
  searchParams,
}: PageProps<"/hall-of-fame">) {
  return (
    <Suspense fallback={<div className="av-hall" />}>
      <Hall searchParams={searchParams} />
    </Suspense>
  );
}
