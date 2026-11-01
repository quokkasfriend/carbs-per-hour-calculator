import { HUMIDITY_LEVEL_PCT, INPUT_RANGES, TEMP_LEVEL_C, TRAINING_RPE_PRESET, type ConditionLevel } from "../core/constants";
import { parseFuelPlanInput } from "../core";
import type {
  CaffeineSensitivity,
  Context,
  GiHistory,
  Level,
  SaltySweater,
  Sex,
  Sport,
  TrainingType,
} from "../core";

export const HEALTH_KEYS = [
  "diabetesOnMedication",
  "kidneyDisease",
  "heartCondition",
  "pregnant",
  "highBloodPressure",
  "ibdIbs",
  "fructoseIntolerance",
  "nsaids",
  "redsSigns",
] as const;
type HealthKey = (typeof HEALTH_KEYS)[number];

export interface HoursMinutes {
  h: string;
  m: string;
}

/** Everything the form holds. Numbers are strings so an empty field stays empty. Never persisted. */
export interface FormState {
  /** Chosen first: nothing is assumed. */
  context: "" | Context;
  trainingType: "" | TrainingType;
  sport: "" | Sport;
  duration: HoursMinutes;
  swim: HoursMinutes;
  bike: HoursMinutes;
  run: HoursMinutes;
  rpe: number;
  startTime: string;
  temperature: ConditionLevel;
  humidity: ConditionLevel;
  altitudeOver2500: boolean;
  weightKg: string;
  sex: "" | Sex;
  age: string;
  level: "" | Level;
  toleratedGPerH: string;
  gutTrained: boolean;
  giHistory: GiHistory;
  sweatRateLPerH: string;
  sweatSodiumMgPerL: string;
  saltySweater: SaltySweater;
  caffeine: boolean;
  caffeineSensitivity: CaffeineSensitivity;
  health: Record<HealthKey, boolean>;
}

const emptyHm = (): HoursMinutes => ({ h: "", m: "" });

export function initialFormState(): FormState {
  return {
    context: "",
    trainingType: "",
    sport: "",
    duration: emptyHm(),
    swim: emptyHm(),
    bike: emptyHm(),
    run: emptyHm(),
    rpe: 6,
    startTime: "",
    temperature: "medium",
    humidity: "medium",
    altitudeOver2500: false,
    weightKg: "",
    sex: "",
    age: "",
    level: "",
    toleratedGPerH: "",
    gutTrained: false,
    giHistory: "none",
    sweatRateLPerH: "",
    sweatSodiumMgPerL: "",
    saltySweater: "dont_know",
    caffeine: false,
    caffeineSensitivity: "normal",
    health: Object.fromEntries(HEALTH_KEYS.map((k) => [k, false])) as Record<HealthKey, boolean>,
  };
}

/** "" -> undefined (unset), anything else -> Number (NaN is reported as invalid by the parser). */
const toNum = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s));

export function hmToMinutes(hm: HoursMinutes): number | undefined {
  const h = toNum(hm.h);
  const m = toNum(hm.m);
  if (h === undefined && m === undefined) return undefined;
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Default RPE when the athlete picks a type of session. */
export const presetRpe = (type: TrainingType): number => TRAINING_RPE_PRESET[type];

export function toPayload(f: FormState): Record<string, unknown> {
  const training = f.context === "training";
  const brick = training && f.trainingType === "brick";
  const triathlon = brick || f.sport === "triathlon";
  return {
    context: f.context,
    ...(training ? { trainingType: f.trainingType } : {}),
    sport: brick ? "triathlon" : f.sport,
    ...(triathlon
      ? {
          splits: {
            // A brick has no swim: the engine sets it to 0.
            ...(brick ? {} : { swimMin: hmToMinutes(f.swim) }),
            bikeMin: hmToMinutes(f.bike),
            runMin: hmToMinutes(f.run),
          },
        }
      : { durationMin: hmToMinutes(f.duration) }),
    rpe: f.rpe,
    startTime: f.startTime,
    // Low / Medium / High stand for one representative value each (see constants.ts).
    tempC: TEMP_LEVEL_C[f.temperature],
    humidityPct: HUMIDITY_LEVEL_PCT[f.humidity],
    altitudeOver2500: f.altitudeOver2500,
    weightKg: toNum(f.weightKg),
    sex: f.sex,
    age: toNum(f.age),
    level: f.level,
    toleratedGPerH: toNum(f.toleratedGPerH),
    gutTrained: f.gutTrained,
    giHistory: f.giHistory,
    sweatRateLPerH: toNum(f.sweatRateLPerH),
    sweatSodiumMgPerL: toNum(f.sweatSodiumMgPerL),
    saltySweater: f.saltySweater,
    caffeine: f.caffeine,
    caffeineSensitivity: f.caffeineSensitivity,
    ...f.health,
  };
}

export type StepId = "race" | "athlete" | "health";

export type FieldError =
  | { type: "required" }
  | { type: "invalid" }
  | { type: "range"; min: number; max: number };
export type FieldErrors = Record<string, FieldError>;

const STEP_FIELDS: Record<StepId, string[]> = {
  race: [
    "context", "trainingType", "sport", "durationMin", "splits", "splits.swimMin", "splits.bikeMin", "splits.runMin",
    "rpe", "startTime",
  ],
  athlete: ["weightKg", "sex", "age", "level", "toleratedGPerH", "sweatRateLPerH", "sweatSodiumMgPerL"],
  health: [],
};

/** [payload path, range] for every numeric field the form checks against its range. */
const RANGE_CHECKS: [string, { min: number; max: number }][] = [
  ["durationMin", INPUT_RANGES.durationMin],
  ["splits.swimMin", INPUT_RANGES.splitMin],
  ["splits.bikeMin", INPUT_RANGES.splitMin],
  ["splits.runMin", INPUT_RANGES.splitMin],
  ["weightKg", INPUT_RANGES.weightKg],
  ["age", INPUT_RANGES.age],
  ["toleratedGPerH", INPUT_RANGES.toleratedGPerH],
  ["sweatRateLPerH", INPUT_RANGES.sweatRateLPerH],
  ["sweatSodiumMgPerL", INPUT_RANGES.sweatSodiumMgPerL],
];

function valueAt(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), payload);
}

/** Errors for the fields of one step (the parser clamps silently; the form tells the user instead). */
export function validateStep(f: FormState, step: StepId): FieldErrors {
  const payload = toPayload(f);
  const fields = STEP_FIELDS[step];
  const errors: FieldErrors = {};

  // The first choice is explicit: an empty context must not silently become a race.
  if (step === "race" && f.context === "") {
    errors.context = { type: "required" };
    return errors;
  }

  const parsed = parseFuelPlanInput(payload);
  if (!parsed.ok) {
    for (const e of parsed.errors) {
      if (fields.includes(e.field)) errors[e.field] = { type: e.code };
    }
  }
  for (const [path, range] of RANGE_CHECKS) {
    if (!fields.includes(path) || errors[path]) continue;
    const v = valueAt(payload, path);
    if (typeof v === "number" && Number.isFinite(v) && (v < range.min || v > range.max)) {
      errors[path] = { type: "range", min: range.min, max: range.max };
    }
  }
  return errors;
}
