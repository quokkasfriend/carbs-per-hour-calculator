import { DEFAULT_RACE_RPE, INPUT_RANGES as R, TRAINING_RPE_PRESET, TRAINING_TYPES } from "./constants";
import type {
  CaffeineSensitivity,
  Context,
  FuelPlanInput,
  GiHistory,
  Level,
  ParseResult,
  SaltySweater,
  Sex,
  Sport,
  TrainingType,
  TriathlonSplits,
  ValidationError,
} from "./types";

const CONTEXTS: readonly Context[] = ["race", "training"];
const SPORTS: readonly Sport[] = ["road_running", "track", "trail_ultra", "ocr", "triathlon", "cycling", "swimming"];
const SEXES: readonly Sex[] = ["female", "male", "prefer_not_to_say"];
const LEVELS: readonly Level[] = ["beginner", "recreational", "trained", "elite"];
const GI: readonly GiHistory[] = ["none", "mild", "moderate", "severe"];
const SALTY: readonly SaltySweater[] = ["yes", "no", "dont_know"];
const SENSITIVITY: readonly CaffeineSensitivity[] = ["low", "normal", "high"];

const BOOLEAN_FIELDS = [
  "altitudeOver2500",
  "gutTrained",
  "caffeine",
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

const START_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const isUnset = (v: unknown): boolean => v === undefined || v === null || v === "";
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const clamp = (x: number, min: number, max: number): number => Math.min(max, Math.max(min, x));

/**
 * Validates untrusted input (browser form or API body) and returns a FuelPlanInput.
 * Numbers must be finite JSON numbers; out-of-range values are clamped to the range of
 * the form, empty optional fields take their default, missing required fields and
 * values of the wrong type are reported as errors. Unknown keys are dropped.
 */
export function parseFuelPlanInput(body: unknown): ParseResult {
  const errors: ValidationError[] = [];
  if (!isRecord(body)) return { ok: false, errors: [{ field: "inputs", code: "invalid" }] };
  const raw: Record<string, unknown> = body;

  const fail = (field: string, code: "required" | "invalid") => {
    errors.push({ field, code });
  };

  function num(field: string, min: number, max: number, opts: { int?: boolean; required: true }): number;
  function num(field: string, min: number, max: number, opts?: { int?: boolean; required?: false }): number | undefined;
  function num(
    field: string,
    min: number,
    max: number,
    opts: { int?: boolean; required?: boolean } = {},
  ): number | undefined {
    const v = raw[field];
    if (isUnset(v)) {
      if (opts.required) fail(field, "required");
      return undefined;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      fail(field, "invalid");
      return undefined;
    }
    const x = clamp(opts.int ? Math.round(v) : v, min, max);
    return x;
  }

  function oneOf<T extends string>(field: string, allowed: readonly T[], def?: T): T {
    const v = raw[field];
    if (isUnset(v)) {
      if (def === undefined) fail(field, "required");
      return (def ?? allowed[0]) as T;
    }
    if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
      fail(field, "invalid");
      return (def ?? allowed[0]) as T;
    }
    return v as T;
  }

  // Absent means a race (how the plan always worked); a training session names its type.
  const context = oneOf("context", CONTEXTS, "race");
  const trainingType: TrainingType | undefined =
    context === "training" ? oneOf<TrainingType>("trainingType", TRAINING_TYPES) : undefined;
  const brick = trainingType === "brick";

  const sport = oneOf("sport", SPORTS);
  if (context === "training" && !errors.some((e) => e.field === "sport")) {
    // A brick is triathlon training; other sessions are single-sport (no triathlon splits).
    if (brick ? sport !== "triathlon" : sport === "triathlon") fail("sport", "invalid");
  }

  let durationMin = 0;
  let splits: TriathlonSplits | undefined;
  if (sport === "triathlon") {
    const s = raw.splits;
    if (isUnset(s)) {
      fail("splits", "required");
    } else if (!isRecord(s)) {
      fail("splits", "invalid");
    } else {
      const part = (key: keyof TriathlonSplits): number => {
        const v = s[key];
        if (isUnset(v)) {
          fail(`splits.${key}`, "required");
          return 0;
        }
        if (typeof v !== "number" || !Number.isFinite(v)) {
          fail(`splits.${key}`, "invalid");
          return 0;
        }
        return clamp(Math.round(v), R.splitMin.min, R.splitMin.max);
      };
      splits = { swimMin: brick ? 0 : part("swimMin"), bikeMin: part("bikeMin"), runMin: part("runMin") };
      durationMin = splits.swimMin + splits.bikeMin + splits.runMin;
    }
  } else {
    durationMin = num("durationMin", R.durationMin.min, R.durationMin.max, { int: true, required: true }) ?? 0;
  }

  const rpe =
    num("rpe", R.rpe.min, R.rpe.max, { int: true }) ??
    (trainingType ? TRAINING_RPE_PRESET[trainingType] : DEFAULT_RACE_RPE);
  const tempC = num("tempC", R.tempC.min, R.tempC.max) ?? 18;
  const humidityPct = num("humidityPct", R.humidityPct.min, R.humidityPct.max) ?? 50;

  let startTime: string | undefined;
  if (!isUnset(raw.startTime)) {
    if (typeof raw.startTime === "string" && START_TIME_RE.test(raw.startTime)) startTime = raw.startTime;
    else fail("startTime", "invalid");
  }

  const weightKg = num("weightKg", R.weightKg.min, R.weightKg.max, { required: true }) ?? 0;
  const sex = oneOf("sex", SEXES);
  const age = num("age", R.age.min, R.age.max, { int: true, required: true }) ?? 0;
  const level = oneOf("level", LEVELS);
  const toleratedGPerH = num("toleratedGPerH", R.toleratedGPerH.min, R.toleratedGPerH.max, { int: true });
  const giHistory = oneOf("giHistory", GI, "none");
  const sweatRateLPerH = num("sweatRateLPerH", R.sweatRateLPerH.min, R.sweatRateLPerH.max);
  const sweatSodiumMgPerL = num("sweatSodiumMgPerL", R.sweatSodiumMgPerL.min, R.sweatSodiumMgPerL.max, { int: true });
  const saltySweater = oneOf("saltySweater", SALTY, "dont_know");
  const caffeineSensitivity = oneOf("caffeineSensitivity", SENSITIVITY, "normal");

  const flags = {} as Record<(typeof BOOLEAN_FIELDS)[number], boolean>;
  for (const f of BOOLEAN_FIELDS) {
    const v = raw[f];
    if (isUnset(v)) flags[f] = false;
    else if (typeof v === "boolean") flags[f] = v;
    else {
      fail(f, "invalid");
      flags[f] = false;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const input: FuelPlanInput = {
    context,
    ...(trainingType ? { trainingType } : {}),
    sport,
    durationMin,
    ...(splits ? { splits } : {}),
    rpe,
    ...(startTime ? { startTime } : {}),
    tempC,
    humidityPct,
    weightKg,
    sex,
    age,
    level,
    ...(toleratedGPerH !== undefined ? { toleratedGPerH } : {}),
    giHistory,
    ...(sweatRateLPerH !== undefined ? { sweatRateLPerH } : {}),
    ...(sweatSodiumMgPerL !== undefined ? { sweatSodiumMgPerL } : {}),
    saltySweater,
    caffeineSensitivity,
    ...flags,
  };
  return { ok: true, input };
}
