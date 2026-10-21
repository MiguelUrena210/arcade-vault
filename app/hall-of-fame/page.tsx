import type { Metadata } from "next";
import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import { GAMES, getGame } from "@/lib/games";

export const metadata: Metadata = { title: "Salón de la Fama" };

async function Hall({ searchParams }: { searchParams: PageProps<"/hall-of-fame">["searchParams"] }) {
  const { game } = await searchParams;
  const id = typeof game === "string" && getGame(game) ? game : GAMES[0].id;
  return <HallOfFame gameId={id} />;
}

export default function HallOfFamePage({ searchParams }: PageProps<"/hall-of-fame">) {
  return (
    <Suspense fallback={<div className="av-hall" />}>
      <Hall searchParams={searchParams} />
    </Suspense>
  );
}
