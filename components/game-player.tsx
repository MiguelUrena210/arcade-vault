"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { GameCanvas } from "@/components/game-canvas";
import { saveScore } from "@/app/games/[id]/play/actions";
import { ENGINES } from "@/games/registry";
import type { EngineStats } from "@/games/types";
import type { Game } from "@/lib/games";

type Run = { score: number; level: number };

function runReducer(
  run: Run,
  action: { type: "tick"; points: number } | { type: "reset" },
): Run {
  if (action.type === "reset") return { score: 0, level: 1 };
  const score = run.score + action.points;
  return { score, level: score % 2500 < 100 ? run.level + 1 : run.level };
}

const INITIAL_STATS: EngineStats = { score: 0, lives: 3, level: 1 };

export function GamePlayer({ game }: { game: Game }) {
  const engine = ENGINES[game.slug];
  const [sim, dispatch] = useReducer(runReducer, { score: 0, level: 1 });
  const [simLives, setLives] = useState(3);
  const [real, setReal] = useState<EngineStats>(INITIAL_STATS);
  const [theme, setTheme] = useState(engine?.themes?.[0]?.id);
  const [restartKey, setRestartKey] = useState(0);
  const { score, level } = engine ? real : sim;
  const lives = engine ? real.lives : simLives;
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (engine || over || paused) return;
    const t = setInterval(
      () =>
        dispatch({ type: "tick", points: Math.floor(10 + Math.random() * 90) }),
      220,
    );
    return () => clearInterval(t);
  }, [engine, over, paused]);

  useEffect(() => {
    if (!engine || over) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "KeyP" || e.code === "Escape") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, over]);

  const restart = () => {
    dispatch({ type: "reset" });
    setLives(3);
    setReal(INITIAL_STATS);
    setRestartKey((k) => k + 1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setSaveError(null);
  };

  const save = async () => {
    if (!game.savesScores) {
      setSaved(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveScore(game.id, name, score);
      if (result.ok) setSaved(true);
      else setSaveError(result.error);
    } catch {
      setSaveError("No se pudo guardar la puntuación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          {engine?.themes && (
            <button
              className="btn ghost"
              onClick={() => {
                const themes = engine.themes!;
                const i = themes.findIndex((t) => t.id === theme);
                setTheme(themes[(i + 1) % themes.length].id);
              }}
            >
              ESTILO: {engine.themes.find((t) => t.id === theme)?.label}
            </button>
          )}
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href={`/games/${game.slug}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {engine ? (
            <GameCanvas
              engine={engine}
              title={game.title}
              paused={paused || over}
              theme={theme}
              restartKey={restartKey}
              onStats={setReal}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={save} disabled={saving}>
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && !saved && (
              <div className="toast-saved" style={{ color: "var(--magenta)" }}>
                ▸ ERROR AL GUARDAR_ {saveError}
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              {saved && game.savesScores && (
                <Link
                  href={`/hall-of-fame?game=${game.slug}`}
                  className="btn yellow"
                >
                  VER RANKING
                </Link>
              )}
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
