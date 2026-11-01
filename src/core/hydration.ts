import {
  DEFICIT_L_PER_KG,
  EAH_LIGHT_WEIGHT_KG,
  EAH_MIN_DURATION_MIN,
  FLUID_CAP_DEFAULT_L_H,
  FLUID_CAP_EAH_L_H,
  FLUID_CAP_MEASURED_L_H,
  FLUID_MIN_DURATION_MIN,
  FLUID_MIN_ML_H,
  SODIUM_DEFAULT_MG_L,
  SODIUM_LONG_FLOOR_MG_H,
  SODIUM_MIN_DURATION_MIN,
  SODIUM_REPLACEMENT_FRACTION,
  SODIUM_SALTY_MG_L,
  SWEAT_BASE_L_H,
  SWEAT_HUMID_ABOVE_PCT,
  SWEAT_MAX_L_H,
  SWEAT_MIN_L_H,
  SWEAT_TEMP_BANDS,
  HEAT_C,
} from "./constants";
import { floor50, round50, roundInt } from "./rounding";
import type { Bucket, FuelPlanInput, Hydration } from "./types";

/** Sodium concentration of the athlete's sweat (mg/L): measured, or a typical / "salty sweater" value. */
export function sweatSodiumMgPerL(input: FuelPlanInput): number {
  return input.sweatSodiumMgPerL ?? (input.saltySweater === "yes" ? SODIUM_SALTY_MG_L : SODIUM_DEFAULT_MG_L);
}

/** Fluids and sodium per hour. `fuelHours` is the time fluids are spread over. */
export function computeHydration(input: FuelPlanInput, bucket: Bucket, fuelHours: number): Hydration {
  const { weightKg, durationMin } = input;

  let sr: number;
  let estimated: boolean;
  if (input.sweatRateLPerH !== undefined) {
    sr = input.sweatRateLPerH;
    estimated = false;
  } else {
    let idx = SWEAT_TEMP_BANDS.findIndex((b) => input.tempC < b.maxCExclusive);
    if (input.humidityPct > SWEAT_HUMID_ABOVE_PCT && input.tempC >= HEAT_C) {
      idx = Math.min(idx + 1, SWEAT_TEMP_BANDS.length - 1);
    }
    sr = Math.min(
      SWEAT_MAX_L_H,
      Math.max(SWEAT_MIN_L_H, (SWEAT_BASE_L_H[bucket] * SWEAT_TEMP_BANDS[idx].factor * weightKg) / 70),
    );
    estimated = true;
  }

  const deficitL = DEFICIT_L_PER_KG * weightKg;
  const fluids = Math.min(Math.max(sr - deficitL / fuelHours, 0), sr);
  const eahRisk =
    durationMin > EAH_MIN_DURATION_MIN &&
    (weightKg < EAH_LIGHT_WEIGHT_KG || input.sex === "female" || input.nsaids);
  const cap = !estimated ? FLUID_CAP_MEASURED_L_H : eahRisk ? FLUID_CAP_EAH_L_H : FLUID_CAP_DEFAULT_L_H;
  // Hard constraint: fluids never exceed the sweat rate, so the 50 mL rounding must not round up past it.
  // (Deliberate deviation from the reference implementation, which can exceed SR by up to 25 mL/h in ~0.3% of inputs.)
  const ml = Math.min(round50(Math.min(fluids, cap) * 1000), floor50(sr * 1000));
  const planned = !(ml < FLUID_MIN_ML_H || durationMin < FLUID_MIN_DURATION_MIN);
  const fluidsMlH = planned ? ml : 0;

  let sodiumMgH = 0;
  if (planned && durationMin >= SODIUM_MIN_DURATION_MIN) {
    let sodium = (ml / 1000) * sweatSodiumMgPerL(input) * SODIUM_REPLACEMENT_FRACTION;
    if (durationMin > EAH_MIN_DURATION_MIN) sodium = Math.max(sodium, SODIUM_LONG_FLOOR_MG_H);
    sodiumMgH = round50(sodium);
  }
  const sodiumMgPer500ml = sodiumMgH > 0 ? roundInt((sodiumMgH / fluidsMlH) * 500) : 0;

  return { sweatRateLPerH: sr, estimated, eahRisk, fluidsMlH, sodiumMgH, sodiumMgPer500ml };
}
