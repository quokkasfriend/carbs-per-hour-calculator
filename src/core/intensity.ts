import { LONG_RACE_MIN } from "./constants";
import type { Bucket } from "./types";

/** RPE bucket; above 6 h a "high" average intensity is not realistic, so it drops to moderate. */
export function intensityBucket(rpe: number, durationMin: number): Bucket {
  const bucket: Bucket = rpe <= 4 ? "low" : rpe <= 6 ? "moderate" : "high";
  return durationMin >= LONG_RACE_MIN && bucket === "high" ? "moderate" : bucket;
}
