"use client";

import { useEffect, useRef } from "react";
import {
  createAsteroids,
  type AsteroidsCallbacks,
  type AsteroidsHandle,
  type AsteroidsTheme,
} from "@/games/asteroids/engine";

type Props = AsteroidsCallbacks & {
  paused: boolean;
  theme: AsteroidsTheme;
  restartKey: number;
};

export function AsteroidsCanvas({
  paused,
  theme,
  restartKey,
  onStats,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<AsteroidsHandle | null>(null);
  const callbacksRef = useRef<AsteroidsCallbacks>({ onStats, onGameOver });
  const themeRef = useRef(theme);
  const restartRef = useRef(restartKey);

  useEffect(() => {
    callbacksRef.current = { onStats, onGameOver };
    themeRef.current = theme;
  });

  useEffect(() => {
    const handle = createAsteroids(
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
  }, []);

  useEffect(() => {
    if (paused) handleRef.current?.pause();
    else handleRef.current?.resume();
  }, [paused]);

  useEffect(() => {
    handleRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (restartRef.current === restartKey) return;
    restartRef.current = restartKey;
    handleRef.current?.restart();
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      aria-label="Asteroids"
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
