import type { SeasononalStats } from "../../tables/seasonstats";

export function createGameModeStats(): SeasononalStats {
  return {
    kills: 0,
    matchesplayed: 0,
    wins: 0,
    top25: 0,
    top10: 0,
    top6: 0,
    top12: 0,
    top5: 0,
    top3: 0,
    top1: 0,
  };
}
