import Link from "next/link";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";

function PodiumInfo({
  row,
  scoreStyle,
}: {
  row?: ScoreRow;
  scoreStyle?: React.CSSProperties;
}) {
  return (
    <>
      <div className="name">{row?.name ?? "—"}</div>
      <div className="score" style={scoreStyle}>
        {row?.score.toLocaleString("es-ES") ?? "—"}
      </div>
      <div className="date">{row?.date ?? "—"}</div>
    </>
  );
}

export function HallOfFame({
  gameId,
  games,
  rows,
}: {
  gameId: string;
  games: Game[];
  rows: ScoreRow[];
}) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <Link
            key={g.slug}
            href={`/hall-of-fame?game=${g.slug}`}
            className={"chip" + (gameId === g.slug ? " active" : "")}
          >
            {g.title}
          </Link>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <PodiumInfo row={rows[1]} />
        </div>
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{
              fontSize: 9,
              color: "var(--gold)",
              letterSpacing: "0.18em",
            }}
          >
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <PodiumInfo row={rows[0]} scoreStyle={{ fontSize: 20 }} />
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <PodiumInfo row={rows[2]} />
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.rank}
            className={
              "tr" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {rows.length === 0 && (
          <div
            className="pixel"
            style={{
              textAlign: "center",
              padding: 48,
              fontSize: 12,
              color: "var(--ink-faint)",
            }}
          >
            SIN PUNTUACIONES AÚN
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
