import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getGame, getGames } from "@/lib/games";
import { getTopScores } from "@/lib/scores";

export async function generateStaticParams() {
  return (await getGames()).map((g) => ({ id: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id);
  return game ? { title: game.title, description: game.short } : {};
}

export default function GameDetail({ params }: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<div className="av-detail" />}>
      <GameDetailContent params={params} />
    </Suspense>
  );
}

async function GameDetailContent({
  params,
}: Pick<PageProps<"/games/[id]">, "params">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const scores = await getTopScores(game.id);

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays.toLocaleString("es-ES")}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best?.toLocaleString("es-ES") ?? "—"}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.slug}/play`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.map((r, i) => (
            <div
              key={r.rank}
              className={
                "lb-row" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {r.date}
                </div>
              </div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            </div>
          ))}
          {scores.length === 0 && (
            <div
              className="pixel"
              style={{
                textAlign: "center",
                padding: 32,
                fontSize: 11,
                color: "var(--ink-faint)",
              }}
            >
              SIN PUNTUACIONES AÚN
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
