import Link from "next/link";
import type { Game } from "@/lib/games";

export function MiniCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="mini-card"
      style={{ display: "block", color: "inherit", textDecoration: "none" }}
    >
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
