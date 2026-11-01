import {
  CAFFEINE_DOSE_FRACTIONS,
  CAFFEINE_MAX_DOSES,
  CAFFEINE_MAX_MG,
  CAFFEINE_MAX_MG_PER_KG,
  CAFFEINE_MG_PER_KG,
  CAFFEINE_MIN_AGE,
  CAFFEINE_MIN_DOSE_MG,
  CAFFEINE_PRE_MINUTE,
  CAFFEINE_SINGLE_DOSE_MAX_DURATION_MIN,
} from "./constants";
import { round5, round10 } from "./rounding";
import type { CaffeineDose, FuelPlanInput } from "./types";

/** Caffeine is on if requested, allowed for this athlete, and the plan has at least one intake. */
export function caffeineActive(input: FuelPlanInput, intakeTimes: number[]): boolean {
  return (
    input.caffeine &&
    !input.pregnant &&
    !input.highBloodPressure &&
    input.age >= CAFFEINE_MIN_AGE &&
    intakeTimes.length > 0
  );
}

/** Nearest intake to `target`; on a tie the earliest wins. */
function nearest(times: number[], target: number): number {
  let best = times[0];
  for (const t of times) {
    const d = Math.abs(t - target);
    const bd = Math.abs(best - target);
    if (d < bd || (d === bd && t < best)) best = t;
  }
  return best;
}

/** §5.8 */
export function computeCaffeine(
  input: FuelPlanInput,
  intakeTimes: number[],
): null | { totalMg: number; mgPerKg: number; doses: CaffeineDose[] } {
  if (!caffeineActive(input, intakeTimes)) return null;

  const mgPerKg = CAFFEINE_MG_PER_KG[input.caffeineSensitivity];
  const total = round10(
    Math.min(input.weightKg * mgPerKg, input.weightKg * CAFFEINE_MAX_MG_PER_KG, CAFFEINE_MAX_MG),
  );
  const dur = input.durationMin;

  if (dur <= CAFFEINE_SINGLE_DOSE_MAX_DURATION_MIN) {
    return { totalMg: total, mgPerKg, doses: [{ minute: CAFFEINE_PRE_MINUTE, mg: total }] };
  }

  const pre = round10(total / 2);
  const rest = total - pre;
  const k = Math.max(
    1,
    Math.min(CAFFEINE_MAX_DOSES, Math.floor(dur / 180), Math.floor(rest / CAFFEINE_MIN_DOSE_MG)),
  );
  const each = round5(rest / k);
  const doses: CaffeineDose[] = [{ minute: CAFFEINE_PRE_MINUTE, mg: pre }];
  for (const f of CAFFEINE_DOSE_FRACTIONS[k]) {
    doses.push({ minute: nearest(intakeTimes, f * dur), mg: each });
  }
  return { totalMg: doses.reduce((s, d) => s + d.mg, 0), mgPerKg, doses };
}
