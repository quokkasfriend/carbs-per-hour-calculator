import { CARB_USE_G_H } from "./constants";
import { sweatSodiumMgPerL } from "./hydration";
import type { FuelPlanInput } from "./types";
import type { ReadyPlan } from "./view";

/** [minutes from the start, cumulative amount] */
export type Point = [number, number];

export interface BalanceSeries {
  /** Cumulative amount taken in: a step line. */
  intake: Point[];
  /** Cumulative amount burned or lost (estimate): a straight line. */
  used: Point[];
  intakeTotal: number;
  usedTotal: number;
}

export interface Balance {
  carbs: BalanceSeries;
  fluids: BalanceSeries;
  sodium: BalanceSeries;
}

function steps(start: number, events: Point[], end: number): { points: Point[]; total: number } {
  const points: Point[] = [[0, start]];
  let sum = start;
  for (const [minute, amount] of events) {
    points.push([minute, sum]);
    sum += amount;
    points.push([minute, sum]);
  }
  points.push([end, sum]);
  return { points, total: sum };
}

/**
 * What the plan gives you against what you burn (carbs) or lose (fluids, sodium), over time. Use is an estimate:
 * carbs from intensity, fluids from the sweat rate, sodium from the sweat rate and its sodium concentration.
 * In a triathlon sweat is counted from the end of the swim, as the fluids plan is.
 */
export function buildBalance(plan: ReadyPlan, input: FuelPlanInput): Balance {
  const end = plan.durationMin;
  const intakes = plan.segments.flatMap((s) => s.intakes).sort((a, b) => a.minute - b.minute);
  const sweatStart = input.sport === "triathlon" && input.splits ? input.splits.swimMin : 0;
  const sweatHours = Math.max(end - sweatStart, 0) / 60;
  const h = plan.hydration;

  const carbs = steps(plan.preStart?.carbsG ?? 0, intakes.map((i) => [i.minute, i.carbsG]), end);
  const fluids = steps(0, intakes.map((i) => [i.minute, i.waterMl]), end);
  const sodium = steps(0, intakes.map((i) => [i.minute, (i.waterMl / 500) * h.sodiumMgPer500ml]), end);

  const line = (from: number, total: number): Point[] => [[from, 0], [end, total]];
  const carbsUsed = (CARB_USE_G_H[plan.bucket] * end) / 60;
  const fluidsLost = h.sweatRateLPerH * 1000 * sweatHours;
  const sodiumLost = h.sweatRateLPerH * sweatHours * sweatSodiumMgPerL(input);

  return {
    carbs: { intake: carbs.points, used: line(0, carbsUsed), intakeTotal: carbs.total, usedTotal: carbsUsed },
    fluids: { intake: fluids.points, used: line(sweatStart, fluidsLost), intakeTotal: fluids.total, usedTotal: fluidsLost },
    sodium: { intake: sodium.points, used: line(sweatStart, sodiumLost), intakeTotal: sodium.total, usedTotal: sodiumLost },
  };
}
