import snapshots from "./research-macro-snapshots.json";
import type { MacroContext } from "./research-briefing";
export function macroAtPublication(publishedAt?: string | null): MacroContext | null {
  const cutoff = Date.parse(publishedAt || "");
  if (!Number.isFinite(cutoff)) return null;
  // Never attach a newer snapshot to a historical edition, including revised past observations.
  const eligible = snapshots.filter(s => Date.parse(s.generatedAt) <= cutoff);
  const snapshot = eligible[eligible.length - 1];
  return snapshot || null;
}
