"use client";

import { useEffect, useRef } from "react";
import type { EngineCallbacks, EngineDef, EngineHandle } from "@/games/types";

type Props = EngineCallbacks & {
  engine: EngineDef;
  title: string;
  paused: boolean;
  theme?: string;
  restartKey: number;
};

export function GameCanvas({
  engine,
  title,
  paused,
  theme,
  restartKey,
  onStats,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<EngineHandle | null>(null);
  const callbacksRef = useRef<EngineCallbacks>({ onStats, onGameOver });
  const themeRef = useRef(theme);
  const restartRef = useRef(restartKey);

  useEffect(() => {
    callbacksRef.current = { onStats, onGameOver };
    themeRef.current = theme;
  });

  useEffect(() => {
    const handle = engine.create(
      canvasRef.current!,
      {
        onStats: (s) => callbacksRef.current.onStats(s),
        onGameOver: (s) => callbacksRef.current.onGameOver(s),
      },
      themeRef.current,
    );
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    if (paused) handleRef.current?.pause();
    else handleRef.current?.resume();
  }, [paused]);

  useEffect(() => {
    if (theme) handleRef.current?.setTheme?.(theme);
  }, [theme]);

  useEffect(() => {
    if (restartRef.current === restartKey) return;
    restartRef.current = restartKey;
    handleRef.current?.restart();
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={engine.width}
      height={engine.height}
      aria-label={title}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
