import {
  AGE_SENIOR,
  CAFFEINE_LATE_ARRIVAL_MIN,
  CAFFEINE_MIN_AGE,
  EAH_MIN_DURATION_MIN,
  FLUID_CAP_MEASURED_L_H,
  HEAT_C,
  MANY_FLASKS_ABOVE,
  MOUTH_RINSE_MAX_DURATION_MIN,
  MOUTH_RINSE_MIN_DURATION_MIN,
  NO_FUEL_BELOW_MIN,
  SODIUM_HIGH_MG_H,
} from "./constants";
import type { FuelPlanInput, GiHistory, Hydration, Warning, WarningCode, WarningSeverity } from "./types";

const SEVERITY: Record<WarningCode, WarningSeverity> = {
  MEDICAL_BLOCK: "block",
  PREGNANCY: "warning",
  HIGH_BP: "warning",
  REDS: "warning",
  EAH_RISK: "warning",
  EAH_SYMPTOMS: "info",
  NSAIDS: "warning",
  HEAT: "info",
  ALTITUDE: "info",
  ESTIMATED_SWEAT: "info",
  HIGH_SWEAT_RATE: "info",
  AGE_65: "info",
  UNDER_18: "info",
  GI_HISTORY: "info",
  GI_FLOOR: "warning",
  HIGH_CARB_PRACTICE: "info",
  FRUCTOSE: "warning",
  CAFFEINE_LATE: "info",
  SODIUM_HIGH: "warning",
  MANY_FLASKS: "info",
  MOUTH_RINSE: "info",
  NO_FUEL: "info",
  NEW_ON_RACE_DAY: "info",
  PRACTICE_FUELLING: "info",
};

export const MEDICAL_BLOCK_WARNING: Warning = { code: "MEDICAL_BLOCK", severity: SEVERITY.MEDICAL_BLOCK };

export function isMedicallyBlocked(input: FuelPlanInput): boolean {
  return input.diabetesOnMedication || input.kidneyDisease || input.heartCondition;
}

/** Minutes after midnight of the start day at which the athlete finishes (can exceed 24 h). */
function arrivalMinutes(startTime: string, durationMin: number): number {
  const [h, m] = startTime.split(":").map(Number);
  return h * 60 + m + durationMin;
}

/** §7, in table order. */
export function computeWarnings(args: {
  input: FuelPlanInput;
  giHistory: GiHistory;
  unlocked: boolean;
  floored: boolean;
  hydration: Hydration;
  caffeineOn: boolean;
  totalFlasks: number;
}): Warning[] {
  const { input, giHistory, unlocked, floored, hydration, caffeineOn, totalFlasks } = args;
  const d = input.durationMin;
  const on: Record<WarningCode, boolean> = {
    MEDICAL_BLOCK: false,
    PREGNANCY: input.pregnant,
    HIGH_BP: input.highBloodPressure,
    REDS: input.redsSigns,
    EAH_RISK: hydration.eahRisk,
    EAH_SYMPTOMS: d > EAH_MIN_DURATION_MIN,
    NSAIDS: input.nsaids,
    HEAT: input.tempC >= HEAT_C,
    ALTITUDE: input.altitudeOver2500,
    ESTIMATED_SWEAT: hydration.estimated,
    HIGH_SWEAT_RATE: !hydration.estimated && hydration.sweatRateLPerH > FLUID_CAP_MEASURED_L_H,
    AGE_65: input.age >= AGE_SENIOR,
    UNDER_18: input.age < CAFFEINE_MIN_AGE,
    GI_HISTORY: giHistory === "moderate" || giHistory === "severe",
    GI_FLOOR: floored,
    HIGH_CARB_PRACTICE: unlocked,
    FRUCTOSE: input.fructoseIntolerance,
    CAFFEINE_LATE:
      caffeineOn && input.startTime !== undefined && arrivalMinutes(input.startTime, d) >= CAFFEINE_LATE_ARRIVAL_MIN,
    SODIUM_HIGH: hydration.sodiumMgH > SODIUM_HIGH_MG_H,
    MANY_FLASKS: totalFlasks > MANY_FLASKS_ABOVE,
    MOUTH_RINSE: d >= MOUTH_RINSE_MIN_DURATION_MIN && d < MOUTH_RINSE_MAX_DURATION_MIN,
    NO_FUEL: d < NO_FUEL_BELOW_MIN,
    NEW_ON_RACE_DAY: input.context === "race",
    PRACTICE_FUELLING: input.context === "training",
  };
  return (Object.keys(SEVERITY) as WarningCode[])
    .filter((code) => on[code])
    .map((code) => ({ code, severity: SEVERITY[code] }));
}
