import { describe, expect, it } from "vitest";
import { parseFuelPlanInput } from "../../core";
import { HUMIDITY_LEVEL_PCT, TEMP_LEVEL_C } from "../../core/constants";
import { initialFormState, toPayload, validateStep, type FormState } from "../formState";

const athlete: Partial<FormState> = { weightKg: "70", age: "30", sex: "male", level: "trained" };
const form = (o: Partial<FormState>): FormState => ({ ...initialFormState(), ...athlete, ...o });
const hm = (h: string, m = "0") => ({ h, m });

describe("form state", () => {
  it("nothing is assumed: no context means an error, not a race", () => {
    expect(validateStep(initialFormState(), "race").context).toEqual({ type: "required" });
  });
  it("training needs a type; sport is not asked for a brick", () => {
    expect(validateStep(form({ context: "training" }), "race").trainingType).toEqual({ type: "required" });
    const brick = form({ context: "training", trainingType: "brick", bike: hm("1", "30"), run: hm("1") });
    expect(Object.keys(validateStep(brick, "race"))).toEqual([]);
    const payload = toPayload(brick);
    expect(payload.sport).toBe("triathlon");
    expect(payload.splits).toEqual({ bikeMin: 90, runMin: 60 });
    expect(parseFuelPlanInput(payload).ok).toBe(true);
  });
  it("a race still needs sport and duration", () => {
    const e = validateStep(form({ context: "race" }), "race");
    expect(e.sport).toEqual({ type: "required" });
    expect(e.durationMin).toEqual({ type: "required" });
  });
  it("Low / Medium / High become degrees and percentages", () => {
    const f = form({ context: "race", sport: "cycling", duration: hm("3"), temperature: "high", humidity: "low" });
    const p = toPayload(f);
    expect(p.tempC).toBe(TEMP_LEVEL_C.high);
    expect(p.humidityPct).toBe(HUMIDITY_LEVEL_PCT.low);
    expect(parseFuelPlanInput(p).ok).toBe(true);
  });
  it("defaults are Medium for both", () => {
    const f = initialFormState();
    expect([f.temperature, f.humidity]).toEqual(["medium", "medium"]);
  });
  it("a training session sends its context and type", () => {
    const f = form({ context: "training", trainingType: "tempo", sport: "road_running", duration: hm("1") });
    const r = parseFuelPlanInput(toPayload(f));
    expect(r.ok && [r.input.context, r.input.trainingType, r.input.sport]).toEqual(["training", "tempo", "road_running"]);
  });
});
