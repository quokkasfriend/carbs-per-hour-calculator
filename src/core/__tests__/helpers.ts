import { buildFuelPlan, parseFuelPlanInput } from "../index";
import type { FuelPlan, FuelPlanInput, WarningCode } from "../types";

/** Defaults of the reference cases: no tolerance, not gut-trained, no GI history, 50% humidity, no health flags. */
const BASE = {
  sport: "road_running",
  durationMin: 120,
  rpe: 6,
  tempC: 18,
  humidityPct: 50,
  weightKg: 70,
  sex: "male",
  age: 35,
  level: "recreational",
} as const;

export function makeInput(overrides: Record<string, unknown> = {}): FuelPlanInput {
  const res = parseFuelPlanInput({ ...BASE, ...overrides });
  if (!res.ok) throw new Error(`invalid test input: ${JSON.stringify(res.errors)}`);
  return res.input;
}

export function planOf(overrides: Record<string, unknown> = {}): Extract<FuelPlan, { blocked: false }> {
  const plan = buildFuelPlan(makeInput(overrides));
  if (plan.blocked) throw new Error("plan unexpectedly blocked");
  return plan;
}

export function warningCodes(plan: FuelPlan): WarningCode[] {
  return plan.warnings.map((w) => w.code).sort();
}

export const sorted = (codes: WarningCode[]): WarningCode[] => [...codes].sort();
