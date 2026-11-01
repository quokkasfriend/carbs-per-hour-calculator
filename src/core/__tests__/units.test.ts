import { describe, expect, it } from "vitest";
import { buildFuelPlan, parseFuelPlanInput } from "../index";
import { ceil5, floor5, round1, round5, round10, round50, roundInt } from "../rounding";
import { intensityBucket } from "../intensity";
import { pickSchedule } from "../schedule";
import { makeInput, planOf, warningCodes } from "./helpers";

describe("rounding", () => {
  it("round5 is half-up", () => {
    expect([0, 2.4, 2.5, 7.5, 12.5, 67.5, 82.4999].map(round5)).toEqual([0, 0, 5, 10, 15, 70, 80]);
  });
  it("floor5 / ceil5 / round10 / round50", () => {
    expect([0, 4.99, 5, 59.9].map(floor5)).toEqual([0, 0, 5, 55]);
    expect([0, 0.01, 5, 23.33, 25.0000000001].map(ceil5)).toEqual([0, 5, 5, 25, 25]);
    expect([4.9, 5, 14.99, 15].map(round10)).toEqual([0, 10, 10, 20]);
    expect([24.99, 25, 74.9, 75, 749.9, 750].map(round50)).toEqual([0, 50, 50, 100, 750, 750]);
  });
  it("absorbs floating-point noise", () => {
    expect(round5(0.1 * 3 * 50 + 2.5 - 15)).toBe(round5(2.5)); // 2.5000000000000004-ish
    expect(floor5(4.999999999999)).toBe(5);
    expect(ceil5(25.0000000001)).toBe(25);
  });
  it("roundInt / round1", () => {
    expect([0.5, 1.5, 2.4].map(roundInt)).toEqual([1, 2, 2]);
    expect([478.3333, 357.5, 83.35].map(round1)).toEqual([478.3, 357.5, 83.4]);
  });
});

describe("intensity bucket", () => {
  it("RPE 4/5 and 6/7 boundaries", () => {
    expect([1, 4, 5, 6, 7, 10].map((r) => intensityBucket(r, 100))).toEqual([
      "low", "low", "moderate", "moderate", "high", "high",
    ]);
  });
  it("high becomes moderate from 360 min", () => {
    expect(intensityBucket(8, 359)).toBe("high");
    expect(intensityBucket(8, 360)).toBe("moderate");
    expect(intensityBucket(3, 600)).toBe("low");
  });
});

describe("duration band boundaries (cycling, RPE 8, 70 kg)", () => {
  const T = (durationMin: number) => planOf({ sport: "cycling", durationMin, rpe: 8 }).targetGPerH;
  it.each([
    [44, 0], [45, 20], [74, 20], [75, 60], [119, 60], [120, 75], [179, 75], [180, 90], [359, 90], [360, 70],
  ])("%i min -> %i g/h", (d, t) => {
    expect(T(d)).toBe(t);
  });
});

describe("RPE and weight boundaries (cycling, 200 min)", () => {
  const T = (o: Record<string, unknown>) => planOf({ sport: "cycling", durationMin: 200, ...o }).targetGPerH;
  it("RPE 4 -> low (60), 5 and 6 -> moderate (75), 7 -> high (90)", () => {
    expect([4, 5, 6, 7].map((rpe) => T({ rpe }))).toEqual([60, 75, 75, 90]);
  });
  it("weight 59.9 gets the 0.9 factor, 60 does not", () => {
    expect(T({ rpe: 6, weightKg: 59.9 })).toBe(70); // 67.5 -> 70
    expect(T({ rpe: 6, weightKg: 60 })).toBe(75);
  });
});

describe("target modifiers", () => {
  it("IBD/IBS lifts GI history to at least moderate and warns", () => {
    const p = planOf({ sport: "cycling", durationMin: 200, rpe: 6, ibdIbs: true });
    expect(p.targetGPerH).toBe(70); // 75 * 0.9 = 67.5 -> 70
    expect(warningCodes(p)).toContain("GI_HISTORY");
  });
  it("heat only reduces when GI history is moderate or severe", () => {
    const hot = (o: Record<string, unknown>) => planOf({ sport: "cycling", durationMin: 200, rpe: 6, tempC: 30, ...o }).targetGPerH;
    expect(hot({})).toBe(75);
    expect(hot({ giHistory: "mild" })).toBe(75);
    expect(hot({ giHistory: "moderate" })).toBe(60); // 75*0.9*0.9 = 60.75
  });
  it("beginner is capped at 60, tolerance at tolerated + 10, fructose at 60", () => {
    const base = { sport: "cycling", durationMin: 200, rpe: 8 };
    expect(planOf({ ...base, level: "beginner" }).targetGPerH).toBe(60);
    expect(planOf({ ...base, toleratedGPerH: 50 }).targetGPerH).toBe(60);
    expect(planOf({ ...base, fructoseIntolerance: true }).targetGPerH).toBe(60);
  });
  it("floor: 30 g/h from 120 min when the cap pushes below, with the flag", () => {
    const p = planOf({ sport: "cycling", durationMin: 150, rpe: 6, toleratedGPerH: 0 });
    expect(p.targetGPerH).toBe(30);
    expect(p.floored).toBe(true);
    expect(warningCodes(p)).toContain("GI_FLOOR");
    const short = planOf({ sport: "cycling", durationMin: 100, rpe: 6, toleratedGPerH: 0 });
    expect(short.floored).toBe(false);
    expect(short.targetGPerH).toBe(10);
  });
});

describe("unlock above 90 g/h is denied when any condition is missing", () => {
  const ok = { sport: "cycling", durationMin: 240, rpe: 6, level: "trained", gutTrained: true, toleratedGPerH: 120 };
  it("baseline unlocks at 120", () => {
    const p = planOf(ok);
    expect([p.unlocked, p.targetGPerH]).toEqual([true, 120]);
  });
  it.each([
    ["not gut-trained", { gutTrained: false }],
    ["no declared tolerance", { toleratedGPerH: undefined }],
    ["beginner", { level: "beginner" }],
    ["fructose intolerance", { fructoseIntolerance: true }],
    ["severe GI history", { giHistory: "severe" }],
    ["shorter than 150 min", { durationMin: 149 }],
    ["low intensity", { rpe: 3 }],
    ["tolerance not above the base target", { toleratedGPerH: 70 }],
  ])("%s", (_name, override) => {
    const p = planOf({ ...ok, ...override });
    expect(p.unlocked).toBe(false);
    expect(p.targetGPerH).toBeLessThanOrEqual(90);
  });
  it("tolerance above 120 is capped at 120", () => {
    expect(planOf({ ...ok, toleratedGPerH: 150 }).targetGPerH).toBe(120);
  });
});

describe("schedule", () => {
  it("returns null when no flask is feasible", () => {
    expect(pickSchedule(0, "cycling")).toBeNull();
  });
  it("swimming only uses a 30 min cadence", () => {
    expect(pickSchedule(60, "swimming")?.cadence).toBe(30);
  });
  it("intakes never fall at the exact end of a segment", () => {
    const p = planOf({ sport: "cycling", durationMin: 200, rpe: 8 });
    const last = p.segments[0].intakes.at(-1)!;
    expect(last.minute).toBeLessThan(200);
  });
});

describe("hydration and sodium", () => {
  it("rounding never pushes fluids above SR (reference.py would give 350 here)", () => {
    const p = planOf({ sport: "cycling", durationMin: 2803, rpe: 7, weightKg: 42.33545975271954, sex: "female", tempC: 5.389182444142222 });
    expect(p.hydration.sweatRateLPerH).toBeCloseTo(0.339, 3);
    expect(p.hydration.fluidsMlH).toBe(300);
  });
  it("no plan under 60 min, none under 150 mL/h", () => {
    expect(planOf({ durationMin: 50, rpe: 8 }).hydration.fluidsMlH).toBe(0);
  });
  it("no sodium under 120 min", () => {
    const p = planOf({ durationMin: 110, rpe: 8, tempC: 30 });
    expect(p.hydration.fluidsMlH).toBeGreaterThan(0);
    expect(p.hydration.sodiumMgH).toBe(0);
  });
  it("sodium over 240 min is at least 300 mg/h", () => {
    const p = planOf({ durationMin: 300, rpe: 3, weightKg: 55, sweatSodiumMgPerL: 200 });
    expect(p.hydration.sodiumMgH).toBeGreaterThanOrEqual(300);
  });
  it("sodium tops out at 1500 mg/h (1 L/h x 2500 mg/L x 0.6)", () => {
    const p = planOf({ durationMin: 300, rpe: 8, sweatRateLPerH: 3.5, sweatSodiumMgPerL: 2500 });
    expect(p.hydration.fluidsMlH).toBe(990); // 1000 planned; the 5 mL rounding of each intake leaves it just below
    expect(p.hydration.sodiumMgH).toBe(1500);
  });
  it("humidity above 70% with temp >= 25 raises the temperature band", () => {
    const dry = planOf({ durationMin: 150, rpe: 6, tempC: 26, humidityPct: 70 }).hydration.sweatRateLPerH;
    const wet = planOf({ durationMin: 150, rpe: 6, tempC: 26, humidityPct: 71 }).hydration.sweatRateLPerH;
    expect(dry).toBeCloseTo(0.8 * 1.25, 6);
    expect(wet).toBeCloseTo(0.8 * 1.5, 6);
  });
});

describe("HIGH_SWEAT_RATE", () => {
  it("fires only for a measured sweat rate above the 1 L/h fluid cap", () => {
    const o = { durationMin: 240, rpe: 6 };
    expect(warningCodes(planOf({ ...o, sweatRateLPerH: 1.5 }))).toContain("HIGH_SWEAT_RATE");
    expect(planOf({ ...o, sweatRateLPerH: 1.5 }).hydration.fluidsMlH).toBeLessThanOrEqual(1000);
    expect(warningCodes(planOf({ ...o, sweatRateLPerH: 1.0 }))).not.toContain("HIGH_SWEAT_RATE");
    expect(warningCodes(planOf({ ...o }))).not.toContain("HIGH_SWEAT_RATE");
  });
});

describe("caffeine", () => {
  const base = { durationMin: 120, caffeine: true };
  it("single pre-race dose up to 180 min", () => {
    const c = planOf(base).caffeine;
    expect(c?.doses).toEqual([{ minute: -60, mg: 210 }]);
  });
  it("dose is capped at 6 mg/kg and 400 mg", () => {
    expect(planOf({ ...base, weightKg: 150, caffeineSensitivity: "low" }).caffeine?.totalMg).toBe(400);
  });
  it.each([
    ["pregnant", { pregnant: true }],
    ["high blood pressure", { highBloodPressure: true }],
    ["under 18", { age: 17 }],
    ["not requested", { caffeine: false }],
  ])("is off when %s", (_n, o) => {
    expect(planOf({ ...base, ...o }).caffeine).toBeNull();
  });
  it("is off when the plan has no intake", () => {
    expect(planOf({ durationMin: 30, caffeine: true }).caffeine).toBeNull();
  });
  it("CAFFEINE_LATE only with a start time and an arrival at 16:00 or later", () => {
    const o = { ...base, durationMin: 240, rpe: 6 };
    expect(warningCodes(planOf({ ...o, startTime: "12:00" }))).toContain("CAFFEINE_LATE"); // 16:00
    expect(warningCodes(planOf({ ...o, startTime: "11:59" }))).not.toContain("CAFFEINE_LATE");
    expect(warningCodes(planOf({ ...o }))).not.toContain("CAFFEINE_LATE");
    expect(warningCodes(planOf({ ...o, startTime: "12:00", caffeine: false }))).not.toContain("CAFFEINE_LATE");
  });
});

describe("warnings", () => {
  it("under-18 and senior warnings", () => {
    expect(warningCodes(planOf({ age: 17 }))).toContain("UNDER_18");
    expect(warningCodes(planOf({ age: 65 }))).toContain("AGE_65");
    expect(warningCodes(planOf({ age: 64 }))).not.toContain("AGE_65");
  });
  it("short races", () => {
    expect(warningCodes(planOf({ durationMin: 44, rpe: 8 }))).toContain("NO_FUEL");
    expect(warningCodes(planOf({ durationMin: 45, rpe: 8 }))).toContain("MOUTH_RINSE");
    expect(warningCodes(planOf({ durationMin: 74, rpe: 8 }))).toContain("MOUTH_RINSE");
    expect(warningCodes(planOf({ durationMin: 75, rpe: 8 }))).not.toContain("MOUTH_RINSE");
  });
  it("health and environment flags", () => {
    const w = warningCodes(
      planOf({ pregnant: true, highBloodPressure: true, redsSigns: true, nsaids: true, altitudeOver2500: true, tempC: 25 }),
    );
    expect(w).toEqual(expect.arrayContaining(["PREGNANCY", "HIGH_BP", "REDS", "NSAIDS", "ALTITUDE", "HEAT"]));
  });
  it("MANY_FLASKS above 6 flasks in total", () => {
    expect(warningCodes(planOf({ sport: "cycling", durationMin: 240, rpe: 8 }))).not.toContain("MANY_FLASKS"); // 6
    expect(warningCodes(planOf({ sport: "cycling", durationMin: 300, rpe: 6 }))).toContain("MANY_FLASKS");
  });
  it("severity follows §7", () => {
    const p = planOf({ nsaids: true });
    const sev = Object.fromEntries(p.warnings.map((w) => [w.code, w.severity]));
    expect(sev.NSAIDS).toBe("warning");
    expect(sev.NEW_ON_RACE_DAY).toBe("info");
  });
});

describe("validation", () => {
  const valid = {
    sport: "cycling", durationMin: 120, rpe: 6, weightKg: 70, sex: "male", age: 30, level: "trained",
  };
  it("applies defaults", () => {
    const r = parseFuelPlanInput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input).toMatchObject({
        tempC: 18, humidityPct: 50, giHistory: "none", saltySweater: "dont_know", caffeineSensitivity: "normal",
        gutTrained: false, caffeine: false, diabetesOnMedication: false,
      });
      expect(r.input.toleratedGPerH).toBeUndefined();
    }
  });
  it("clamps to the ranges of the form", () => {
    const r = parseFuelPlanInput({ ...valid, durationMin: 99999, weightKg: 10, rpe: 99, tempC: -99, toleratedGPerH: 999 });
    expect(r.ok && [r.input.durationMin, r.input.weightKg, r.input.rpe, r.input.tempC, r.input.toleratedGPerH]).toEqual([
      2880, 35, 10, -20, 150,
    ]);
  });
  it("reports missing required fields", () => {
    const r = parseFuelPlanInput({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const fields = r.errors.map((e) => e.field);
      expect(fields).toEqual(expect.arrayContaining(["sport", "weightKg", "sex", "age", "level"]));
    }
  });
  it.each([
    ["non-object", "nope"],
    ["null", null],
    ["unknown enum", { ...valid, sport: "curling" }],
    ["string number", { ...valid, weightKg: "70" }],
    ["NaN", { ...valid, age: NaN }],
    ["non-boolean flag", { ...valid, pregnant: "yes" }],
    ["bad start time", { ...valid, startTime: "25:00" }],
  ])("rejects %s", (_n, body) => {
    expect(parseFuelPlanInput(body).ok).toBe(false);
  });
  it("triathlon needs splits; duration is their sum", () => {
    expect(parseFuelPlanInput({ ...valid, sport: "triathlon" }).ok).toBe(false);
    const r = parseFuelPlanInput({
      ...valid, sport: "triathlon", durationMin: 1, splits: { swimMin: 30, bikeMin: 180, runMin: 120 },
    });
    expect(r.ok && r.input.durationMin).toBe(330);
  });
  it("treats empty optional fields as unset and drops unknown keys", () => {
    const r = parseFuelPlanInput({ ...valid, toleratedGPerH: "", sweatRateLPerH: null, startTime: "", extra: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect("toleratedGPerH" in r.input).toBe(false);
      expect("extra" in r.input).toBe(false);
    }
  });
});

// Deterministic PRNG so failures are reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("invariants on 1000 random inputs", () => {
  const rnd = mulberry32(20260517);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const between = (a: number, b: number) => a + rnd() * (b - a);
  const maybe = <T,>(p: number, v: T): T | undefined => (rnd() < p ? v : undefined);

  const inputs = Array.from({ length: 1000 }, () => {
    const sport = pick(["road_running", "trail_ultra", "ocr", "triathlon", "cycling", "swimming"] as const);
    return {
      sport,
      durationMin: Math.round(between(20, 2880)),
      splits: { swimMin: Math.round(between(5, 120)), bikeMin: Math.round(between(5, 600)), runMin: Math.round(between(5, 400)) },
      rpe: Math.round(between(1, 10)),
      startTime: maybe(0.5, "07:30"),
      tempC: between(-20, 45),
      humidityPct: between(0, 100),
      altitudeOver2500: rnd() < 0.1,
      weightKg: between(35, 150),
      sex: pick(["female", "male", "prefer_not_to_say"] as const),
      age: Math.round(between(16, 90)),
      level: pick(["beginner", "recreational", "trained", "elite"] as const),
      toleratedGPerH: maybe(0.5, Math.round(between(0, 150))),
      gutTrained: rnd() < 0.5,
      giHistory: pick(["none", "mild", "moderate", "severe"] as const),
      sweatRateLPerH: maybe(0.4, between(0.2, 3.5)),
      sweatSodiumMgPerL: maybe(0.4, Math.round(between(200, 2500))),
      saltySweater: pick(["yes", "no", "dont_know"] as const),
      caffeine: rnd() < 0.5,
      caffeineSensitivity: pick(["low", "normal", "high"] as const),
      pregnant: rnd() < 0.05,
      highBloodPressure: rnd() < 0.05,
      ibdIbs: rnd() < 0.1,
      fructoseIntolerance: rnd() < 0.1,
      nsaids: rnd() < 0.1,
      redsSigns: rnd() < 0.1,
    };
  });

  it("fluids never exceed the sweat rate; flasks <= 60 g; rate <= target; same input, same plan", () => {
    for (const raw of inputs) {
      const parsed = parseFuelPlanInput(raw);
      if (!parsed.ok) throw new Error(JSON.stringify([raw, parsed.errors]));
      const plan = buildFuelPlan(parsed.input);
      if (plan.blocked) throw new Error("unexpectedly blocked");

      // Hard constraint: never above the sweat rate (deviates from reference.py in rounding-up cases).
      expect(plan.hydration.fluidsMlH / 1000).toBeLessThanOrEqual(plan.hydration.sweatRateLPerH);
      expect(plan.hydration.fluidsMlH).toBeLessThanOrEqual(1000);
      for (const s of plan.segments) {
        expect(s.perFlask).toBeLessThanOrEqual(60);
        expect(s.rateGPerH).toBeLessThanOrEqual(s.targetGPerH + 1e-9);
        for (const f of s.flasks) {
          expect(f.carbsG).toBeLessThanOrEqual(60);
          expect(f.carbsG).toBeGreaterThan(0);
          expect(f.product).toBe(plan.product);
        }
        for (const i of s.intakes) expect(i.minute).toBeLessThan(s.startMin + s.durationMin);
      }
      expect(plan.targetGPerH).toBeLessThanOrEqual(120);
      if (plan.targetGPerH > 90) expect(plan.unlocked).toBe(true);
      if (parsed.input.fructoseIntolerance) expect(plan.product).toBe("typetwo");
      expect(buildFuelPlan(parsed.input)).toEqual(plan);
    }
  });
});

describe("makeInput helper", () => {
  it("is valid", () => {
    expect(makeInput().sport).toBe("road_running");
  });
});
