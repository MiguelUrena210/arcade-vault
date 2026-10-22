export type AsteroidsTheme = "neon" | "classic";

export type Palette = {
  bg: string;
  ship: string;
  flame: string;
  bullet: string;
  asteroid: string;
  particle: string;
  glow: number;
};

export const PALETTES: Record<AsteroidsTheme, Palette> = {
  classic: {
    bg: "#000",
    ship: "#fff",
    flame: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    particle: "255,255,255",
    glow: 0,
  },
  neon: {
    bg: "#000",
    ship: "#00f5ff",
    flame: "rgba(255, 130, 0, 0.85)",
    bullet: "#f5ff00",
    asteroid: "#ff006e",
    particle: "245,255,0",
    glow: 8,
  },
};
