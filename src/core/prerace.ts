import {
  FUEL_UP_G_PER_KG,
  LOADING_G_PER_KG,
  LOADING_MIN_DURATION_MIN,
  PRE_FLUID_2H_ML_PER_KG,
  PRE_FLUID_4H_ML_PER_KG,
  PRE_MEAL_HOURS,
  RECOVERY_CARBS_G_PER_KG_H,
  RECOVERY_PROTEIN_G_PER_KG,
} from "./constants";
import { round50 } from "./rounding";
import type { FuelPlanInput, PreRace } from "./types";

/**
 * §5.9. Gram values are exact products of the weight (not rounded): the UI formats them.
 */
export function computePreRace(input: FuelPlanInput): PreRace {
  const w = input.weightKg;
  const mealGByHours = {} as PreRace["mealGByHours"];
  for (const h of PRE_MEAL_HOURS) mealGByHours[h] = h * w;
  return {
    // Carb loading and the 24 h fuel-up are for races; a training session keeps the meal and fluids below.
    ...(input.context === "training"
      ? {}
      : input.durationMin > LOADING_MIN_DURATION_MIN
        ? { loadingGPerDay: LOADING_G_PER_KG * w }
        : { fuelUp24hG: FUEL_UP_G_PER_KG * w }),
    mealGByHours,
    fluid4hMl: round50(PRE_FLUID_4H_ML_PER_KG * w),
    fluid2hMl: round50(PRE_FLUID_2H_ML_PER_KG * w),
  };
}

/** §5.10 */
export function computeRecovery(input: FuelPlanInput): { carbsGPerH: [number, number]; proteinG: number } {
  const w = input.weightKg;
  return {
    carbsGPerH: [RECOVERY_CARBS_G_PER_KG_H[0] * w, RECOVERY_CARBS_G_PER_KG_H[1] * w],
    proteinG: RECOVERY_PROTEIN_G_PER_KG * w,
  };
}
