import type { Database } from "@/lib/supabase/database.types";

export type GameCategory = Database["public"]["Enums"]["game_category"];
export type GameColor = Database["public"]["Enums"]["game_color"];

export type Game = {
  id: number;
  slug: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: `cover-${string}`;
  color: GameColor;
  savesScores: boolean;
  best: number | null;
  plays: number;
};

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
