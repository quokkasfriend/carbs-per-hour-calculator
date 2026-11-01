import { computeCaffeine, caffeineActive } from "./caffeine";
import { computeTarget, effectiveGiHistory } from "./carbs";
import { round5 } from "./rounding";
import { computeHydration } from "./hydration";
import { intensityBucket } from "./intensity";
import { computePreRace, computeRecovery } from "./prerace";
import { buildSegments, fuelHours, intakeMinutes, preStartFor, totalFlasks } from "./schedule";
import type { FuelPlan, FuelPlanInput, Hydration, Segment } from "./types";
import { MEDICAL_BLOCK_WARNING, computeWarnings, isMedicallyBlocked } from "./warnings";

/**
 * The water per intake is rounded to 5 mL, so the hourly figure shown is the one the intakes really add up to
 * (never above the planned amount): "350 mL per hour" must not sit next to 120 mL every 20 minutes.
 */
function alignFluids(h: Hydration, segments: Segment[]): Hydration {
  const fed = segments.filter((s) => s.intakes.length > 0);
  const minutes = fed.reduce((sum, s) => sum + s.durationMin, 0);
  if (h.fluidsMlH === 0 || minutes === 0) return h;
  // Hourly rate of each segment (water per intake over its cadence), averaged over the time spent fuelling.
  const rate = fed.reduce((sum, s) => sum + ((s.intakes[0].waterMl * 60) / (s.cadenceMin ?? 60)) * s.durationMin, 0) / minutes;
  const fluidsMlH = Math.min(h.fluidsMlH, round5(rate));
  const sodiumMgPer500ml = h.sodiumMgH > 0 ? Math.round((h.sodiumMgH / fluidsMlH) * 500) : 0;
  return { ...h, fluidsMlH, sodiumMgPer500ml };
}

/**
 * Pure and deterministic: same input, same plan. `input` must come from parseFuelPlanInput
 * (or satisfy the same ranges).
 */
export function buildFuelPlan(input: FuelPlanInput): FuelPlan {
  if (isMedicallyBlocked(input)) return { blocked: true, warnings: [MEDICAL_BLOCK_WARNING] };

  const bucket = intensityBucket(input.rpe, input.durationMin);
  const { targetGPerH, unlocked, floored } = computeTarget(input, bucket);
  const product = "typetwo";

  const planned = computeHydration(input, bucket, fuelHours(input));
  const segments = buildSegments(input, targetGPerH, product, planned.fluidsMlH);
  const hydration = alignFluids(planned, segments);
  const times = intakeMinutes(segments);
  const caffeine = computeCaffeine(input, times);

  const warnings = computeWarnings({
    input,
    giHistory: effectiveGiHistory(input),
    unlocked,
    floored,
    hydration,
    caffeineOn: caffeineActive(input, times),
    totalFlasks: totalFlasks(segments),
  });

  const preStart = preStartFor(input);
  return {
    blocked: false,
    context: input.context,
    ...(input.trainingType ? { trainingType: input.trainingType } : {}),
    durationMin: input.durationMin,
    bucket,
    targetGPerH,
    unlocked,
    floored,
    ratio: "2:1",
    product,
    segments,
    ...(preStart ? { preStart } : {}),
    hydration,
    caffeine,
    preRace: computePreRace(input),
    recovery: computeRecovery(input),
    warnings,
  };
}

export { parseFuelPlanInput } from "./validate";
export type * from "./types";
