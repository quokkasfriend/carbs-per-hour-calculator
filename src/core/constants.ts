// Single home for every number of the fuel plan (docs/fuel-plan/plan.md §2 and §5).
import type { Bucket, GiHistory, Product, Sport, TrainingType } from "./types";

// --- Products (§2) ---------------------------------------------------------

export const MAX_CARBS_PER_FLASK_G = 60;

export const PRODUCTS: Record<
  Product,
  {
    ratio: "2:1";
    /** fructose : glucose */
    fgRatio: number;
    /** grams of powder per gram of carbohydrate */
    powderPerCarb: number;
    /** sodium (mg) per gram of powder: negligible, kept for documentation */
    sodiumMgPerGPowder: number;
  }
> = {
  typetwo: {
    ratio: "2:1",
    fgRatio: 0.5,
    powderPerCarb: 31.39 / 30,
    sodiumMgPerGPowder: 0.39,
  },
};

// --- Intensity and carb target (§5.1, §5.2) ---------------------------------

export const LONG_RACE_MIN = 360;

/** Base carbs (g/h) by total duration: first row whose `maxMinExclusive` is above the duration. */
export const BASE_TABLE: ReadonlyArray<{
  maxMinExclusive: number;
  low: number;
  moderate: number;
  high: number;
}> = [
  { maxMinExclusive: 45, low: 0, moderate: 0, high: 0 },
  { maxMinExclusive: 75, low: 0, moderate: 0, high: 20 },
  { maxMinExclusive: 120, low: 30, moderate: 45, high: 60 },
  { maxMinExclusive: 180, low: 45, moderate: 60, high: 75 },
  { maxMinExclusive: 360, low: 60, moderate: 75, high: 90 },
  { maxMinExclusive: Infinity, low: 50, moderate: 70, high: 70 },
];

// [euristica]
export const SPORT_FACTOR: Record<Sport, number> = {
  road_running: 0.85,
  track: 0.85,
  trail_ultra: 0.9,
  ocr: 0.85,
  cycling: 1.0,
  swimming: 1.0,
  triathlon: 1.0,
};

export const LIGHT_WEIGHT_KG = 60;
export const LIGHT_WEIGHT_FACTOR = 0.9;

// [euristica]
export const GI_FACTOR: Record<GiHistory, number> = {
  none: 1,
  mild: 1,
  moderate: 0.9,
  severe: 0.8,
};

export const HEAT_C = 25;
export const HEAT_GI_FACTOR = 0.9;

export const CARB_CAP_G_H = 90;
export const BEGINNER_CAP_G_H = 60;
export const FRUCTOSE_CAP_G_H = 60;
export const TOLERATED_MARGIN_G_H = 10;

export const UNLOCK_MAX_G_H = 120;
export const UNLOCK_MIN_DURATION_MIN = 150;

export const FLOOR_MIN_DURATION_MIN = 120;
export const FLOOR_G_H = 30;

/**
 * Rough whole-body carbohydrate use (g/h) by intensity, for the "intake vs. use" chart only. Not an input to the plan:
 * an estimate in the range usually quoted for endurance exercise (about 0.8–1.7 g/min).
 */
export const CARB_USE_G_H: Record<Bucket, number> = { low: 50, moderate: 80, high: 100 };

// --- Segments and schedule (§5.3, §5.5) -------------------------------------

export const TRIATHLON_RUN_TARGET_FACTOR = 0.85;
export const PRE_START_CARBS_G = 20;
export const PRE_START_MINUTES_BEFORE = "10–15";

export const DEFAULT_CADENCES_MIN: readonly number[] = [20, 15];
export const SWIMMING_CADENCES_MIN: readonly number[] = [30];
export const MAX_INTAKES_PER_FLASK = 6;
export const MANY_FLASKS_ABOVE = 6;

// --- Fluids and sodium (§5.6, §5.7) -----------------------------------------

// [euristica]
export const SWEAT_BASE_L_H: Record<Bucket, number> = {
  low: 0.5,
  moderate: 0.8,
  high: 1.1,
};
export const SWEAT_TEMP_BANDS: ReadonlyArray<{ maxCExclusive: number; factor: number }> = [
  { maxCExclusive: 15, factor: 0.7 },
  { maxCExclusive: 25, factor: 1.0 },
  { maxCExclusive: 30, factor: 1.25 },
  { maxCExclusive: Infinity, factor: 1.5 },
];
export const SWEAT_HUMID_ABOVE_PCT = 70;
export const SWEAT_MIN_L_H = 0.3;
export const SWEAT_MAX_L_H = 2.0;

export const DEFICIT_L_PER_KG = 0.015;
export const EAH_MIN_DURATION_MIN = 240;
export const EAH_LIGHT_WEIGHT_KG = 60;
// [euristica]: no source sets a cap; ~1 L/h is the most athletes can comfortably drink while exercising.
export const FLUID_CAP_MEASURED_L_H = 1.0;
export const FLUID_CAP_EAH_L_H = 0.6;
export const FLUID_CAP_DEFAULT_L_H = 0.75;
export const FLUID_MIN_ML_H = 150;
export const FLUID_MIN_DURATION_MIN = 60;

export const SODIUM_DEFAULT_MG_L = 950;
export const SODIUM_SALTY_MG_L = 1300;
export const SODIUM_REPLACEMENT_FRACTION = 0.6;
export const SODIUM_MIN_DURATION_MIN = 120;
export const SODIUM_LONG_FLOOR_MG_H = 300;
export const SODIUM_HIGH_MG_H = 1500;

// --- Caffeine (§5.8) ---------------------------------------------------------

export const CAFFEINE_MIN_AGE = 18;
export const CAFFEINE_MG_PER_KG = { high: 2, normal: 3, low: 4.5 } as const;
export const CAFFEINE_MAX_MG_PER_KG = 6;
export const CAFFEINE_MAX_MG = 400;
export const CAFFEINE_SINGLE_DOSE_MAX_DURATION_MIN = 180;
export const CAFFEINE_PRE_MINUTE = -60;
export const CAFFEINE_MIN_DOSE_MG = 25;
export const CAFFEINE_MAX_DOSES = 4;
export const CAFFEINE_DOSE_FRACTIONS: Record<number, readonly number[]> = {
  1: [0.6],
  2: [0.5, 0.75],
  3: [0.4, 0.6, 0.8],
  4: [0.4, 0.55, 0.7, 0.85],
};
export const CAFFEINE_LATE_ARRIVAL_MIN = 16 * 60;

// --- Before and after the race (§5.9, §5.10) ---------------------------------

export const LOADING_MIN_DURATION_MIN = 90;
export const LOADING_G_PER_KG = 10;
export const FUEL_UP_G_PER_KG = 7;
export const PRE_MEAL_HOURS: readonly (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
export const PRE_FLUID_4H_ML_PER_KG = 6;
export const PRE_FLUID_2H_ML_PER_KG = 4;
export const RECOVERY_CARBS_G_PER_KG_H: readonly [number, number] = [1.0, 1.2];
export const RECOVERY_PROTEIN_G_PER_KG = 0.3;

// --- Warnings (§7) -----------------------------------------------------------

export const AGE_SENIOR = 65;
export const MOUTH_RINSE_MIN_DURATION_MIN = 45;
export const MOUTH_RINSE_MAX_DURATION_MIN = 75;
export const NO_FUEL_BELOW_MIN = 45;

// --- Input ranges (§3), shared by the validator and the form --------------------

export const INPUT_RANGES = {
  durationMin: { min: 20, max: 2880 },
  splitMin: { min: 5, max: 1200 },
  rpe: { min: 1, max: 10 },
  tempC: { min: -20, max: 45 },
  humidityPct: { min: 0, max: 100 },
  weightKg: { min: 35, max: 150 },
  age: { min: 16, max: 90 },
  toleratedGPerH: { min: 0, max: 150 },
  sweatRateLPerH: { min: 0.2, max: 3.5 },
  sweatSodiumMgPerL: { min: 200, max: 2500 },
} as const;

// --- Training sessions -------------------------------------------------------------

export const TRAINING_TYPES: readonly TrainingType[] = ["easy", "long", "tempo", "intervals", "brick"];

/**
 * Default RPE for each type of session (the athlete can change it). The engine is the same as for races:
 * the type only sets this starting RPE and, for a brick, the bike + run structure. [euristica]
 */
export const TRAINING_RPE_PRESET: Record<TrainingType, number> = {
  easy: 3,
  long: 5,
  tempo: 7,
  intervals: 8,
  brick: 6,
};
export const DEFAULT_RACE_RPE = 6;

// --- Conditions chosen as Low / Medium / High ----------------------------------------

export const CONDITION_LEVELS = ["low", "medium", "high"] as const;
export type ConditionLevel = (typeof CONDITION_LEVELS)[number];

/**
 * The form asks for Low / Medium / High; the engine keeps working with degrees and percentages.
 * Each level stands for one representative value inside its reference range (shown to the athlete):
 *   temperature: low < 15 °C, medium 15–24 °C, high ≥ 25 °C (matches the engine's HEAT_C and sweat bands up to 30 °C)
 *   humidity:    low < 40 %,      medium 40–70 %,       high > 70 % (the engine only cares about > 70 %)
 * Note: "high" temperature stands for 28 °C, so the ≥ 30 °C sweat band is not reachable from the form.
 */
export const TEMP_LEVEL_C: Record<ConditionLevel, number> = { low: 10, medium: 20, high: 28 };
export const HUMIDITY_LEVEL_PCT: Record<ConditionLevel, number> = { low: 30, medium: 55, high: 85 };
