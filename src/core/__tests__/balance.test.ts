import { describe, expect, it } from "vitest";
import { buildBalance } from "../balance";
import { makeInput, planOf } from "./helpers";

describe("buildBalance", () => {
  const o = { durationMin: 210, rpe: 7, tempC: 15 };
  const b = buildBalance(planOf(o), makeInput(o));

  it("adds up the intakes of the plan", () => {
    const plan = planOf(o);
    expect(b.carbs.intakeTotal).toBeCloseTo(plan.segments[0].totalCarbsG + (plan.preStart?.carbsG ?? 0), 5);
    expect(b.fluids.intakeTotal).toBe(plan.segments[0].intakes.reduce((s, i) => s + i.waterMl, 0));
  });

  it("never plans to drink more than the sweat lost", () => {
    expect(b.fluids.intakeTotal).toBeLessThanOrEqual(b.fluids.usedTotal);
  });

  it("ends every line at the end of the activity", () => {
    for (const s of [b.carbs, b.fluids, b.sodium]) {
      expect(s.intake[s.intake.length - 1][0]).toBe(210);
      expect(s.used[s.used.length - 1]).toEqual([210, s.usedTotal]);
    }
  });

  it("counts sweat in a triathlon from the end of the swim", () => {
    const t = { sport: "triathlon", durationMin: 300, splits: { swimMin: 60, bikeMin: 150, runMin: 90 } };
    const tb = buildBalance(planOf(t), makeInput(t));
    expect(tb.fluids.used[0][0]).toBe(60);
    expect(tb.carbs.used[0][0]).toBe(0);
  });
});
