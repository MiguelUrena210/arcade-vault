import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import { GAMES, getGame } from "@/lib/games";

async function Hall({ searchParams }: { searchParams: PageProps<"/salon">["searchParams"] }) {
  const { juego } = await searchParams;
  const id = typeof juego === "string" && getGame(juego) ? juego : GAMES[0].id;
  return <HallOfFame gameId={id} />;
}

export default function SalonPage({ searchParams }: PageProps<"/salon">) {
  return (
    <Suspense fallback={<div className="av-hall" />}>
      <Hall searchParams={searchParams} />
    </Suspense>
  );
}
