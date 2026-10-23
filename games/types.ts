export type EngineStats = { score: number; lives: number; level: number };

export type EngineCallbacks = {
  onStats: (stats: EngineStats) => void; // solo cuando cambia algún valor
  onGameOver: (score: number) => void;
};

export type EngineHandle = {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF y quita listeners
  setTheme?(theme: string): void;
};

export type EngineDef = {
  create(
    canvas: HTMLCanvasElement,
    callbacks: EngineCallbacks,
    theme?: string,
  ): EngineHandle;
  width: number;
  height: number;
  themes?: { id: string; label: string }[]; // el primero es el default
};
