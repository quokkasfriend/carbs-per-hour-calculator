import { describe, expect, it } from "vitest";
import { createTranslator } from "use-intl";
import en from "../../messages/en.json";
import { buildFuelPlan, parseFuelPlanInput } from "../index";
import { HUMIDITY_LEVEL_PCT, TEMP_LEVEL_C, TRAINING_RPE_PRESET, TRAINING_TYPES } from "../constants";
import { buildPlanView, buildWarningItems, TRAINING_OVERRIDES, type Translate } from "../view";
import { makeInput, planOf, warningCodes } from "./helpers";
import type { WarningCode } from "../types";

const t = createTranslator({ locale: "en", messages: en, namespace: "FuelPlan" }) as unknown as Translate & { raw: (k: string) => unknown };

const training = (type: string, o: Record<string, unknown> = {}) => ({ context: "training", trainingType: type, sport: "cycling", durationMin: 150, ...o });
const brick = (o: Record<string, unknown> = {}) => ({ context: "training", trainingType: "brick", sport: "triathlon", splits: { bikeMin: 90, runMin: 60 }, ...o });

describe("training input", () => {
  it("a missing context is a race (how the plan always worked)", () => {
    expect(makeInput().context).toBe("race");
    expect(planOf().context).toBe("race");
  });
  it("RPE defaults to the preset of the type of session, and an explicit RPE wins", () => {
    for (const type of TRAINING_TYPES) {
      const o = type === "brick" ? brick() : training(type);
      const r = parseFuelPlanInput({ weightKg: 70, sex: "male", age: 30, level: "trained", ...o });
      expect(r.ok && r.input.rpe).toBe(TRAINING_RPE_PRESET[type]);
    }
    expect(makeInput(training("easy", { rpe: 8 })).rpe).toBe(8);
  });
  it.each([
    ["training without a type", { context: "training" }],
    ["unknown type", training("sprint")],
    ["unknown context", { context: "match" }],
    ["brick on a non-triathlon sport", brick({ sport: "cycling", durationMin: 120, splits: undefined })],
    ["triathlon for a non-brick session", training("long", { sport: "triathlon", splits: { swimMin: 20, bikeMin: 60, runMin: 30 } })],
  ])("rejects %s", (_n, o) => {
    expect(parseFuelPlanInput({ sport: "cycling", durationMin: 120, weightKg: 70, sex: "male", age: 30, level: "trained", ...o }).ok).toBe(false);
  });
  it("a brick needs bike and run but not a swim; its duration is bike + run", () => {
    const p = planOf(brick());
    expect(p.durationMin).toBe(150);
    expect(parseFuelPlanInput({ weightKg: 70, sex: "male", age: 30, level: "trained", ...brick({ splits: { bikeMin: 90 } }) }).ok).toBe(false);
  });
});

describe("brick session", () => {
  const b = planOf(brick());
  // Same bike and run in a triathlon race (total 170 min, same duration band as the 150 min brick): identical fuelling per part.
  const tri = planOf({ sport: "triathlon", splits: { swimMin: 20, bikeMin: 90, runMin: 60 }, rpe: TRAINING_RPE_PRESET.brick });
  it("has bike then run, no swim and no pre-start", () => {
    expect(b.segments.map((s) => s.name)).toEqual(["bike", "run"]);
    expect(b.preStart).toBeUndefined();
    expect(b.segments[1].startMin).toBe(90);
  });
  it("fuels each part exactly like the same part of a triathlon", () => {
    expect(b.targetGPerH).toBe(tri.targetGPerH);
    for (const name of ["bike", "run"]) {
      const x = b.segments.find((s) => s.name === name)!;
      const y = tri.segments.find((s) => s.name === name)!;
      expect([x.targetGPerH, x.rateGPerH, x.cadenceMin, x.perFlask, x.intakes.length, x.totalCarbsG, x.flasks.length]).toEqual([
        y.targetGPerH, y.rateGPerH, y.cadenceMin, y.perFlask, y.intakes.length, y.totalCarbsG, y.flasks.length,
      ]);
    }
    expect(b.hydration.fluidsMlH).toBeGreaterThan(0);
  });
});

describe("training plan content", () => {
  const p = planOf(training("long", { durationMin: 180 }));
  it("same numbers as a race with the same inputs", () => {
    const race = planOf({ sport: "cycling", durationMin: 180, rpe: TRAINING_RPE_PRESET.long });
    expect(p.targetGPerH).toBe(race.targetGPerH);
    expect(p.segments).toEqual(race.segments);
    expect(p.hydration).toEqual(race.hydration);
  });
  it("no carb loading or 24 h fuel-up, but the meal and fluids before the session stay", () => {
    expect(p.preRace.loadingGPerDay).toBeUndefined();
    expect(p.preRace.fuelUp24hG).toBeUndefined();
    expect(p.preRace.mealGByHours[3]).toBe(210);
    expect(p.preRace.fluid4hMl).toBe(400);
  });
  it("'nothing new on race day' is only for races; training gets its own note", () => {
    expect(warningCodes(p)).toContain("PRACTICE_FUELLING");
    expect(warningCodes(p)).not.toContain("NEW_ON_RACE_DAY");
    const race = planOf({ sport: "cycling", durationMin: 180 });
    expect(warningCodes(race)).toContain("NEW_ON_RACE_DAY");
    expect(warningCodes(race)).not.toContain("PRACTICE_FUELLING");
  });
  it("a medical block still blocks a training session", () => {
    expect(buildFuelPlan(makeInput(training("easy", { diabetesOnMedication: true }))).blocked).toBe(true);
  });
});

describe("training wording", () => {
  it("every override has a twin under `training` and a race original", () => {
    for (const key of TRAINING_OVERRIDES) {
      const race = t.raw(key);
      const twin = t.raw(`training.${key}`);
      expect(typeof race).toBe("string");
      expect(typeof twin).toBe("string");
      expect(twin).not.toBe(race);
    }
  });
  it("every warning code has a message", () => {
    const codes = Object.keys(en.FuelPlan.warnings);
    const engine: WarningCode[] = ["MEDICAL_BLOCK", "PREGNANCY", "HIGH_BP", "REDS", "EAH_RISK", "EAH_SYMPTOMS", "NSAIDS", "HEAT", "ALTITUDE", "ESTIMATED_SWEAT", "HIGH_SWEAT_RATE", "AGE_65", "UNDER_18", "GI_HISTORY", "GI_FLOOR", "HIGH_CARB_PRACTICE", "FRUCTOSE", "CAFFEINE_LATE", "SODIUM_HIGH", "MANY_FLASKS", "MOUTH_RINSE", "NO_FUEL", "NEW_ON_RACE_DAY", "PRACTICE_FUELLING"];
    for (const c of engine) expect(codes).toContain(c);
  });
  it("a training plan never talks about a race (the fixed disclaimer aside)", () => {
    const o = training("long", { durationMin: 400, weightKg: 55, sex: "female", nsaids: true, caffeine: true, startTime: "12:00", tempC: 30, altitudeOver2500: true, gutTrained: true, toleratedGPerH: 100, level: "elite", rpe: 6 });
    const input = makeInput(o);
    const plan = planOf(o);
    const view = buildPlanView(plan, input, t);
    const texts = [
      view.heading, ...view.summary.items.flatMap((i) => [i.label, i.value, i.note ?? ""]),
      ...(view.typetwo ? [view.typetwo.intro, view.typetwo.heading, ...view.typetwo.segments.flatMap((s) => s.lines), ...view.typetwo.benefits] : []),
      ...view.timeline.rates,
      view.timeline.intro, ...view.timeline.rows.flatMap((r) => [r.take, r.caffeine ?? ""]),
      ...view.hydration.lines.map((l) => l.text), ...(view.caffeine?.doses ?? []),
      view.preRace.heading, view.preRace.mealIntro, view.preRace.fluids, view.recovery.heading, ...view.recovery.lines,
      ...view.warnings.items.map((w) => w.text),
      ...buildWarningItems((Object.keys(en.FuelPlan.warnings) as WarningCode[]).filter((c) => c !== "MEDICAL_BLOCK").map((code) => ({ code, severity: "info" as const })), t, "training").filter((w) => w.code !== "NEW_ON_RACE_DAY").map((w) => w.text),
    ];
    for (const x of texts) expect(x, x).not.toMatch(/\brace(s)?\b/i);
  });
});

describe("temperature and humidity levels", () => {
  it("each level's value sits inside the reference range shown to the athlete", () => {
    expect(TEMP_LEVEL_C.low).toBeLessThan(15);
    expect(TEMP_LEVEL_C.medium).toBeGreaterThanOrEqual(15);
    expect(TEMP_LEVEL_C.medium).toBeLessThan(25);
    expect(TEMP_LEVEL_C.high).toBeGreaterThanOrEqual(25);
    expect(HUMIDITY_LEVEL_PCT.low).toBeLessThan(40);
    expect(HUMIDITY_LEVEL_PCT.medium).toBeGreaterThanOrEqual(40);
    expect(HUMIDITY_LEVEL_PCT.medium).toBeLessThanOrEqual(70);
    expect(HUMIDITY_LEVEL_PCT.high).toBeGreaterThan(70);
  });
  it("the labels show those same reference ranges", () => {
    const r = en.FuelPlan.race;
    expect(r.temperature.options.low).toContain("15");
    expect(r.temperature.options.medium).toContain("15");
    expect(r.temperature.options.medium).toContain("24");
    expect(r.temperature.options.high).toContain("25");
    expect(r.humidity.options.low).toContain("40");
    expect(r.humidity.options.medium).toContain("70");
    expect(r.humidity.options.high).toContain("70");
  });
  it("high temperature triggers the heat warning; low and medium do not", () => {
    expect(warningCodes(planOf({ tempC: TEMP_LEVEL_C.high }))).toContain("HEAT");
    expect(warningCodes(planOf({ tempC: TEMP_LEVEL_C.medium }))).not.toContain("HEAT");
    expect(warningCodes(planOf({ tempC: TEMP_LEVEL_C.low }))).not.toContain("HEAT");
  });
  it("high humidity only matters together with heat (sweat band)", () => {
    const sr = (tempC: number, humidityPct: number) => planOf({ durationMin: 150, tempC, humidityPct }).hydration.sweatRateLPerH;
    expect(sr(TEMP_LEVEL_C.high, HUMIDITY_LEVEL_PCT.high)).toBeGreaterThan(sr(TEMP_LEVEL_C.high, HUMIDITY_LEVEL_PCT.medium));
    expect(sr(TEMP_LEVEL_C.medium, HUMIDITY_LEVEL_PCT.high)).toBe(sr(TEMP_LEVEL_C.medium, HUMIDITY_LEVEL_PCT.low));
  });
});
