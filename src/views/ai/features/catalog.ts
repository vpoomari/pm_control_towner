// PM CONTROL TOWER — AI Feature Studio · catalogue aggregator
// Folds the ten batch files into one ordered catalogue. Batch files are owned by
// their batch authors; this file is owned by the core (never edited by batches).

import type { FeatureLoader, FeatureMeta } from "./meta";
import { metas as metas01, loaders as loaders01 } from "./batch-01";

const BATCHES: Array<{ metas: FeatureMeta[]; loaders: Record<string, FeatureLoader> }> = [
  { metas: metas01, loaders: loaders01 },
  // batch-02 … batch-10 are appended as they land (see docs/AI-FEATURE-ROADMAP.md §7).
];

/** Every feature, in importance order (f001 → f100). */
export const FEATURES: FeatureMeta[] = BATCHES.flatMap((b) => b.metas).sort((a, b) => a.rank - b.rank);

/** id → lazy component loader. */
export const LOADERS: Record<string, FeatureLoader> = Object.assign(
  {},
  ...BATCHES.map((b) => b.loaders),
);

export function featureById(id: string): FeatureMeta | undefined {
  return FEATURES.find((f) => f.id === id);
}
