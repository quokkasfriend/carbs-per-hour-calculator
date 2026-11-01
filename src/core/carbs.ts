import {
  BASE_TABLE,
  BEGINNER_CAP_G_H,
  CARB_CAP_G_H,
  FLOOR_G_H,
  FLOOR_MIN_DURATION_MIN,
  FRUCTOSE_CAP_G_H,
  GI_FACTOR,
  HEAT_C,
  HEAT_GI_FACTOR,
  LIGHT_WEIGHT_FACTOR,
  LIGHT_WEIGHT_KG,
  SPORT_FACTOR,
  TOLERATED_MARGIN_G_H,
  UNLOCK_MAX_G_H,
  UNLOCK_MIN_DURATION_MIN,
} from "./constants";
import { round5 } from "./rounding";
import type { Bucket, FuelPlanInput, GiHistory } from "./types";

/** With IBD/IBS the stomach history counts as at least "moderate". */
export function effectiveGiHistory(input: FuelPlanInput): GiHistory {
  if (input.ibdIbs && (input.giHistory === "none" || input.giHistory === "mild")) return "moderate";
  return input.giHistory;
}

export interface CarbTarget {
  /** Rounded target, g/h. */
  targetGPerH: number;
  unlocked: boolean;
  floored: boolean;
}

/** Carb target (g/h): base table by duration and effort, scaled and capped by the athlete's answers. */
export function computeTarget(input: FuelPlanInput, bucket: Bucket): CarbTarget {
  const { durationMin } = input;
  const row = BASE_TABLE.find((r) => durationMin < r.maxMinExclusive) ?? BASE_TABLE[BASE_TABLE.length - 1];
  const base = row[bucket];
  const gi = effectiveGiHistory(input);
  const tolerated = input.toleratedGPerH;

  let t =
    base *
    SPORT_FACTOR[input.sport] *
    (input.weightKg < LIGHT_WEIGHT_KG ? LIGHT_WEIGHT_FACTOR : 1) *
    GI_FACTOR[gi];
  if (input.tempC >= HEAT_C && (gi === "moderate" || gi === "severe")) t *= HEAT_GI_FACTOR;

  let cap = CARB_CAP_G_H;
  if (input.level === "beginner") cap = Math.min(cap, BEGINNER_CAP_G_H);
  if (tolerated !== undefined) cap = Math.min(cap, tolerated + TOLERATED_MARGIN_G_H);
  if (input.fructoseIntolerance) cap = Math.min(cap, FRUCTOSE_CAP_G_H);
  t = Math.min(t, cap);

  // Above 90 g/h only on explicit declaration; the sport factor does not apply.
  let unlocked = false;
  if (
    input.gutTrained &&
    tolerated !== undefined &&
    input.level !== "beginner" &&
    !input.fructoseIntolerance &&
    gi !== "severe" &&
    durationMin >= UNLOCK_MIN_DURATION_MIN &&
    bucket !== "low" &&
    tolerated > t
  ) {
    t = Math.min(tolerated, UNLOCK_MAX_G_H);
    unlocked = true;
  }

  let floored = false;
  if (durationMin >= FLOOR_MIN_DURATION_MIN && t < FLOOR_G_H) {
    t = FLOOR_G_H;
    floored = true;
  }

  return { targetGPerH: round5(t), unlocked, floored };
}

