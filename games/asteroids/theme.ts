export type AsteroidsTheme = "neon" | "classic" | "notebook";

export type Palette = {
  bg: string;
  grid: string | null; // líneas de cuadrícula cada 40 px; null = sin cuadrícula
  ship: string;
  flame: string;
  bullet: string;
  asteroid: string;
  particle: string; // "r,g,b"
  lineWidth: number; // trazo de nave y asteroides
  glow: number;
};

export const PALETTES: Record<AsteroidsTheme, Palette> = {
  classic: {
    bg: "#000",
    grid: null,
    ship: "#fff",
    flame: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    particle: "255,255,255",
    lineWidth: 1.5,
    glow: 0,
  },
  neon: {
    bg: "#000",
    grid: null,
    ship: "#00f5ff",
    flame: "rgba(255, 130, 0, 0.85)",
    bullet: "#f5ff00",
    asteroid: "#ff006e",
    particle: "245,255,0",
    lineWidth: 1.5,
    glow: 8,
  },
  notebook: {
    bg: "#f5f1e6",
    grid: "rgba(29, 58, 138, 0.10)",
    ship: "#1d3a8a",
    flame: "rgba(200, 16, 46, 0.85)",
    bullet: "#c8102e",
    asteroid: "#2b2b2b",
    particle: "29,58,138",
    lineWidth: 2,
    glow: 0,
  },
};
