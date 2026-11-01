// Reference cases A–K. Expected values come from an independent reference implementation of the same rules.
// Warning sets are complete: every warning condition, not only the ones listed per case.
import { describe, expect, it } from "vitest";
import { buildFuelPlan } from "../index";
import { makeInput, planOf, sorted, warningCodes } from "./helpers";

const seg = (plan: ReturnType<typeof planOf>, name: string) => {
  const s = plan.segments.find((x) => x.name === name);
  if (!s) throw new Error(`no segment ${name}`);
  return s;
};

describe("A — marathon, 210 min, RPE 7", () => {
  const plan = planOf({
    durationMin: 210, rpe: 7, weightKg: 70, tempC: 15, caffeine: true, caffeineSensitivity: "normal",
  });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.bucket).toBe("high");
    expect(plan.targetGPerH).toBe(75);
    expect(plan.unlocked).toBe(false);
    expect(plan.ratio).toBe("2:1");
    expect(plan.product).toBe("typetwo");
    expect([s.cadenceMin, s.perFlask, s.portionG, s.rateGPerH]).toEqual([20, 50, 25, 75]);
    expect(s.intakes).toHaveLength(10);
    expect(s.intakes[0].minute).toBe(20);
    expect(s.intakes[9].minute).toBe(200);
    expect(s.totalCarbsG).toBe(250);
    expect(s.flasks.map((f) => f.carbsG)).toEqual([50, 50, 50, 50, 50]);
    expect(plan.hydration.sweatRateLPerH).toBeCloseTo(1.1, 3);
    expect(plan.hydration.estimated).toBe(true);
    expect(plan.hydration.fluidsMlH).toBe(750);
    expect(plan.hydration.sodiumMgH).toBe(450);
    expect(plan.hydration.sodiumMgPer500ml).toBe(300);
    expect(plan.caffeine?.totalMg).toBe(210);
    expect(plan.caffeine?.doses).toEqual([{ minute: -60, mg: 110 }, { minute: 120, mg: 100 }]);
    expect(plan.preRace.loadingGPerDay).toBe(700);
    expect(plan.preRace.fuelUp24hG).toBeUndefined();
    expect(plan.preRace.mealGByHours[3]).toBe(210);
    expect([plan.preRace.fluid4hMl, plan.preRace.fluid2hMl]).toEqual([400, 300]);
    expect(plan.preStart).toBeUndefined();
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(sorted(["ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]));
  });
});

describe("B — A without caffeine, gut-trained, tolerates 90", () => {
  const plan = planOf({ durationMin: 210, rpe: 7, tempC: 15, gutTrained: true, toleratedGPerH: 90 });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(90);
    expect(plan.unlocked).toBe(true);
    expect(plan.ratio).toBe("2:1");
    expect(plan.product).toBe("typetwo");
    expect([s.cadenceMin, s.perFlask, s.portionG]).toEqual([20, 60, 30]);
    expect(s.intakes).toHaveLength(10);
    expect(s.totalCarbsG).toBe(300);
    expect(s.flasks).toHaveLength(5);
    expect(s.flasks.every((f) => f.product === "typetwo" && f.fgRatio === 0.5)).toBe(true);
    expect(plan.hydration.fluidsMlH).toBe(750);
    expect(plan.hydration.sodiumMgH).toBe(450);
    expect(plan.caffeine).toBeNull();
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(
      sorted(["HIGH_CARB_PRACTICE", "ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]),
    );
  });
});

describe("C — Ironman, splits 70/360/270", () => {
  const plan = planOf({
    sport: "triathlon", splits: { swimMin: 70, bikeMin: 360, runMin: 270 }, rpe: 5, weightKg: 75, age: 40,
    level: "trained", tempC: 28, humidityPct: 60, gutTrained: true, toleratedGPerH: 100,
    caffeine: true, caffeineSensitivity: "normal",
  });
  it("matches", () => {
    expect(plan.durationMin).toBe(700);
    expect(plan.targetGPerH).toBe(100);
    expect(plan.unlocked).toBe(true);
    expect(plan.ratio).toBe("2:1");
    expect(plan.product).toBe("typetwo");
    const swim = seg(plan, "swim");
    expect(swim.intakes).toHaveLength(0);
    const bike = seg(plan, "bike");
    expect([bike.cadenceMin, bike.perFlask, bike.portionG, bike.rateGPerH]).toEqual([15, 50, 25, 100]);
    expect(bike.intakes).toHaveLength(23);
    expect(bike.intakes[0].minute).toBe(85);
    expect(bike.totalCarbsG).toBe(575);
    expect(bike.flasks).toHaveLength(12);
    expect(bike.flasks[11].carbsG).toBe(25);
    const run = seg(plan, "run");
    expect([run.targetGPerH, run.rateGPerH, run.cadenceMin, run.perFlask, run.portionG]).toEqual([85, 82.5, 20, 55, 27.5]);
    expect(run.intakes).toHaveLength(13);
    expect(run.totalCarbsG).toBe(357.5);
    expect(run.flasks).toHaveLength(7);
    expect(run.flasks[6].carbsG).toBe(30);
    expect(plan.preStart).toEqual({ carbsG: 20, minutesBefore: "10–15" });
    // 750 mL/h planned; 185 mL every 15 min on the bike and 250 mL every 20 min on the run add up to a little less.
    expect(plan.hydration.fluidsMlH).toBe(745);
    expect(plan.hydration.sodiumMgH).toBe(450);
    expect(plan.caffeine?.totalMg).toBe(225);
    expect(plan.caffeine?.doses).toEqual([
      { minute: -60, mg: 120 }, { minute: 280, mg: 35 }, { minute: 415, mg: 35 }, { minute: 550, mg: 35 },
    ]);
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(
      sorted([
        "HIGH_CARB_PRACTICE", "HEAT", "MANY_FLASKS", "EAH_SYMPTOMS",
        "ESTIMATED_SWEAT", "NEW_ON_RACE_DAY",
      ]),
    );
  });
});

describe("D — OCR sprint, 60 min, beginner", () => {
  const plan = planOf({ sport: "ocr", durationMin: 60, rpe: 8, weightKg: 65, age: 28, level: "beginner", tempC: 20 });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(15);
    expect([s.cadenceMin, s.portionG]).toEqual([20, 5]);
    expect(s.intakes).toHaveLength(2);
    expect(s.totalCarbsG).toBe(10);
    expect(s.flasks.map((f) => f.carbsG)).toEqual([10]);
    expect(plan.hydration.fluidsMlH).toBe(0);
    expect(plan.hydration.sodiumMgH).toBe(0);
    expect(plan.preRace.fuelUp24hG).toBe(455);
    expect(plan.preRace.loadingGPerDay).toBeUndefined();
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(sorted(["MOUTH_RINSE", "ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]));
  });
});

describe("E — trail 100k, 840 min, GI moderate", () => {
  const plan = planOf({
    sport: "trail_ultra", durationMin: 840, rpe: 4, weightKg: 58, sex: "female", age: 38, tempC: 22,
    giHistory: "moderate", toleratedGPerH: 60, caffeine: true, caffeineSensitivity: "high",
  });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(35);
    expect([s.cadenceMin, s.perFlask]).toEqual([20, 35]);
    expect(s.portionG).toBeCloseTo(11.667, 3);
    expect(s.intakes).toHaveLength(41);
    expect(s.totalCarbsG).toBe(478.3);
    expect(s.flasks).toHaveLength(14);
    expect(s.flasks[13].carbsG).toBe(25);
    expect(plan.hydration.sweatRateLPerH).toBeCloseTo(0.414, 3);
    expect(plan.hydration.estimated).toBe(true);
    expect(plan.hydration.eahRisk).toBe(true);
    // 350 mL/h planned; 115 mL every 20 min is 345.
    expect(plan.hydration.fluidsMlH).toBe(345);
    expect(plan.hydration.sodiumMgH).toBe(300);
    expect(plan.hydration.sodiumMgPer500ml).toBe(435);
    expect(plan.caffeine?.totalMg).toBe(120);
    expect(plan.caffeine?.doses).toEqual([
      { minute: -60, mg: 60 }, { minute: 420, mg: 30 }, { minute: 620, mg: 30 },
    ]);
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(
      sorted(["EAH_RISK", "GI_HISTORY", "MANY_FLASKS", "EAH_SYMPTOMS", "ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]),
    );
  });
});

describe("F — elite cyclist, 240 min, measured sweat", () => {
  const plan = planOf({
    sport: "cycling", durationMin: 240, rpe: 6, weightKg: 80, age: 30, level: "elite", tempC: 20,
    gutTrained: true, toleratedGPerH: 120, sweatRateLPerH: 1.4, sweatSodiumMgPerL: 1200,
  });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(120);
    expect(plan.unlocked).toBe(true);
    expect(plan.product).toBe("typetwo");
    expect([s.cadenceMin, s.perFlask, s.portionG]).toEqual([15, 60, 30]);
    expect(s.intakes).toHaveLength(15);
    expect(s.totalCarbsG).toBe(450);
    expect(s.flasks).toHaveLength(8);
    expect(s.flasks[7].carbsG).toBe(30);
    expect(plan.hydration.estimated).toBe(false);
    expect(plan.hydration.fluidsMlH).toBe(1000);
    expect(plan.hydration.sodiumMgH).toBe(700);
    expect(plan.hydration.sodiumMgPer500ml).toBe(350);
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(
      sorted(["HIGH_CARB_PRACTICE", "MANY_FLASKS", "HIGH_SWEAT_RATE", "NEW_ON_RACE_DAY"]),
    );
  });
});

describe("G — half marathon, 105 min", () => {
  const plan = planOf({ durationMin: 105, rpe: 8, weightKg: 60, sex: "female", age: 30 });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(50);
    expect([s.cadenceMin, s.perFlask]).toEqual([20, 50]);
    expect(s.portionG).toBeCloseTo(16.667, 3);
    expect(s.intakes).toHaveLength(5);
    expect(s.totalCarbsG).toBe(83.3);
    expect(s.flasks.map((f) => f.carbsG)).toEqual([50, 35]);
    expect(plan.hydration.fluidsMlH).toBe(450);
    expect(plan.hydration.sodiumMgH).toBe(0);
    expect(plan.hydration.sodiumMgPer500ml).toBe(0);
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(sorted(["ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]));
  });
});

describe("H — blocked (diabetes on medication)", () => {
  it("returns only MEDICAL_BLOCK and no numbers", () => {
    const plan = buildFuelPlan(makeInput({ sport: "cycling", durationMin: 180, rpe: 5, age: 45, diabetesOnMedication: true }));
    expect(plan).toEqual({ blocked: true, warnings: [{ code: "MEDICAL_BLOCK", severity: "block" }] });
  });
  it.each(["diabetesOnMedication", "kidneyDisease", "heartCondition"])("%s blocks", (flag) => {
    expect(buildFuelPlan(makeInput({ [flag]: true })).blocked).toBe(true);
  });
});

describe("I — fructose intolerance", () => {
  const plan = planOf({
    sport: "cycling", durationMin: 300, rpe: 6, weightKg: 72, age: 33, level: "elite", tempC: 20,
    gutTrained: true, toleratedGPerH: 100, fructoseIntolerance: true,
  });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(60);
    expect(plan.unlocked).toBe(false);
    expect(plan.ratio).toBe("2:1");
    expect(plan.product).toBe("typetwo");
    expect([s.cadenceMin, s.perFlask, s.portionG]).toEqual([20, 60, 20]);
    expect(s.intakes).toHaveLength(14);
    expect(s.totalCarbsG).toBe(280);
    expect(s.flasks).toHaveLength(5);
    expect(s.flasks[4].carbsG).toBe(40);
    expect(plan.hydration.fluidsMlH).toBe(600);
    expect(plan.hydration.sodiumMgH).toBe(350);
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(sorted(["FRUCTOSE", "EAH_SYMPTOMS", "ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]));
  });
});

describe("J — hot, GI severe, beginner, 67 y", () => {
  const plan = planOf({
    durationMin: 150, rpe: 6, weightKg: 55, sex: "female", age: 67, level: "beginner", giHistory: "severe",
    tempC: 31, humidityPct: 75, toleratedGPerH: 20, saltySweater: "yes", nsaids: true,
  });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(30);
    expect(plan.floored).toBe(false);
    expect([s.cadenceMin, s.perFlask, s.portionG]).toEqual([20, 60, 10]);
    expect(s.intakes).toHaveLength(7);
    expect(s.totalCarbsG).toBe(70);
    expect(s.flasks.map((f) => f.carbsG)).toEqual([60, 10]);
    expect(plan.hydration.fluidsMlH).toBe(600);
    expect(plan.hydration.sodiumMgH).toBe(450);
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(
      sorted(["AGE_65", "NSAIDS", "HEAT", "GI_HISTORY", "ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]),
    );
  });
});

describe("K — open-water swim, 150 min", () => {
  const plan = planOf({ sport: "swimming", durationMin: 150, rpe: 6, weightKg: 68, age: 29, level: "trained", tempC: 22 });
  it("matches", () => {
    const s = seg(plan, "main");
    expect(plan.targetGPerH).toBe(60);
    expect([s.cadenceMin, s.perFlask, s.portionG]).toEqual([30, 60, 30]);
    expect(s.intakes).toHaveLength(4);
    expect(s.totalCarbsG).toBe(120);
    expect(s.flasks).toHaveLength(2);
    expect(plan.preStart).toEqual({ carbsG: 20, minutesBefore: "10–15" });
    expect(plan.hydration.fluidsMlH).toBe(350);
    expect(plan.hydration.sodiumMgH).toBe(200);
  });
  it("warnings", () => {
    expect(warningCodes(plan)).toEqual(sorted(["ESTIMATED_SWEAT", "NEW_ON_RACE_DAY"]));
  });
});
