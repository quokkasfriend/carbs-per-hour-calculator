export type Sport = "road_running" | "track" | "trail_ultra" | "ocr" | "triathlon" | "cycling" | "swimming";
export type Sex = "female" | "male" | "prefer_not_to_say";
export type Level = "beginner" | "recreational" | "trained" | "elite";
export type GiHistory = "none" | "mild" | "moderate" | "severe";
export type SaltySweater = "yes" | "no" | "dont_know";
export type CaffeineSensitivity = "low" | "normal" | "high";
export type Bucket = "low" | "moderate" | "high";
export type Product = "typetwo";
export type Context = "race" | "training";
/** "brick" = a bike session followed straight by a run (triathlon training). */
export type TrainingType = "easy" | "long" | "tempo" | "intervals" | "brick";
export type SegmentName = "main" | "swim" | "bike" | "run";

export interface TriathlonSplits {
  swimMin: number;
  bikeMin: number;
  runMin: number;
}

/** Validated input (see parseFuelPlanInput). Step 3 answers are flat booleans. */
export interface FuelPlanInput {
  // Step 1 — race or training session
  /** "race" unless the plan is for a training session. */
  context: Context;
  /** Only for training. */
  trainingType?: TrainingType;
  sport: Sport;
  /** For triathlon this is always the sum of `splits` (a brick session has no swim: swimMin is 0). */
  durationMin: number;
  splits?: TriathlonSplits;
  rpe: number;
  /** HH:MM, optional */
  startTime?: string;
  tempC: number;
  humidityPct: number;
  altitudeOver2500: boolean;
  // Step 2 — athlete
  weightKg: number;
  sex: Sex;
  age: number;
  level: Level;
  toleratedGPerH?: number;
  gutTrained: boolean;
  giHistory: GiHistory;
  sweatRateLPerH?: number;
  sweatSodiumMgPerL?: number;
  saltySweater: SaltySweater;
  caffeine: boolean;
  caffeineSensitivity: CaffeineSensitivity;
  // Step 3 — health check
  diabetesOnMedication: boolean;
  kidneyDisease: boolean;
  heartCondition: boolean;
  pregnant: boolean;
  highBloodPressure: boolean;
  ibdIbs: boolean;
  fructoseIntolerance: boolean;
  nsaids: boolean;
  redsSigns: boolean;
}

export type WarningCode =
  | "MEDICAL_BLOCK"
  | "PREGNANCY"
  | "HIGH_BP"
  | "REDS"
  | "EAH_RISK"
  | "EAH_SYMPTOMS"
  | "NSAIDS"
  | "HEAT"
  | "ALTITUDE"
  | "ESTIMATED_SWEAT"
  | "HIGH_SWEAT_RATE"
  | "AGE_65"
  | "UNDER_18"
  | "GI_HISTORY"
  | "GI_FLOOR"
  | "HIGH_CARB_PRACTICE"
  | "FRUCTOSE"
  | "CAFFEINE_LATE"
  | "SODIUM_HIGH"
  | "MANY_FLASKS"
  | "MOUTH_RINSE"
  | "NO_FUEL"
  | "NEW_ON_RACE_DAY"
  | "PRACTICE_FUELLING";

export type WarningSeverity = "block" | "warning" | "info";

/** The text for each code lives in messages/en.json (namespace FuelPlan). */
export interface Warning {
  code: WarningCode;
  severity: WarningSeverity;
}

export interface Flask {
  product: Product;
  carbsG: number;
  powderG: number;
  /** fructose : glucose */
  fgRatio: number;
}

export interface Intake {
  /** Minutes from the start of the race. */
  minute: number;
  /** Minutes from the start of the segment. */
  segmentMinute: number;
  segment: SegmentName;
  carbsG: number;
  /** Index into the segment's `flasks`. */
  flaskIndex: number;
  waterMl: number;
}

export interface Segment {
  name: SegmentName;
  /** Minutes from the start of the race. */
  startMin: number;
  durationMin: number;
  targetGPerH: number;
  /** Actual g/h, slightly below the target when the flask size forces it. */
  rateGPerH: number;
  cadenceMin: number | null;
  /** Grams of carbs in a full flask. */
  perFlask: number;
  /** Intakes per full flask. */
  intakesPerFlask: number;
  portionG: number;
  intakes: Intake[];
  flasks: Flask[];
  totalCarbsG: number;
}

export interface CaffeineDose {
  /** Minutes from the start of the race; -60 = before the start. */
  minute: number;
  mg: number;
}

export interface Hydration {
  sweatRateLPerH: number;
  estimated: boolean;
  eahRisk: boolean;
  fluidsMlH: number;
  sodiumMgH: number;
  sodiumMgPer500ml: number;
}

export interface PreRace {
  loadingGPerDay?: number;
  fuelUp24hG?: number;
  mealGByHours: Record<1 | 2 | 3 | 4, number>;
  fluid4hMl: number;
  fluid2hMl: number;
}

export type FuelPlan =
  | { blocked: true; warnings: Warning[] }
  | {
      blocked: false;
      context: Context;
      trainingType?: TrainingType;
      durationMin: number;
      bucket: Bucket;
      targetGPerH: number;
      unlocked: boolean;
      floored: boolean;
      ratio: "2:1";
      product: Product;
      segments: Segment[];
      preStart?: { carbsG: 20; minutesBefore: "10–15" };
      hydration: Hydration;
      caffeine: null | { totalMg: number; mgPerKg: number; doses: CaffeineDose[] };
      preRace: PreRace;
      recovery: { carbsGPerH: [number, number]; proteinG: number };
      warnings: Warning[];
    };

type ValidationErrorCode = "required" | "invalid";

export interface ValidationError {
  field: string;
  code: ValidationErrorCode;
}

export type ParseResult =
  | { ok: true; input: FuelPlanInput }
  | { ok: false; errors: ValidationError[] };
