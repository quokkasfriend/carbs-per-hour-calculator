import {
  DEFAULT_CADENCES_MIN,
  MAX_CARBS_PER_FLASK_G,
  MAX_INTAKES_PER_FLASK,
  PRE_START_CARBS_G,
  PRE_START_MINUTES_BEFORE,
  PRODUCTS,
  SWIMMING_CADENCES_MIN,
  TRIATHLON_RUN_TARGET_FACTOR,
} from "./constants";
import { ceil5, floor5, round1, roundInt, round5 } from "./rounding";
import type { Flask, FuelPlanInput, Intake, Product, Segment, SegmentName, Sport } from "./types";

interface Schedule {
  cadence: number;
  /** intakes per flask */
  m: number;
  flaskG: number;
  portionG: number;
  rateGPerH: number;
}

/** §5.5: best (cadence, intakes-per-flask) pair: highest rate, then longest flask, then cadence 20. */
export function pickSchedule(targetGPerH: number, sport: Sport): Schedule | null {
  const cadences = sport === "swimming" ? SWIMMING_CADENCES_MIN : DEFAULT_CADENCES_MIN;
  let best: { rate: number; span: number; is20: boolean; s: Schedule } | null = null;
  for (const c of cadences) {
    for (let m = 1; m <= MAX_INTAKES_PER_FLASK; m++) {
      const flaskG = floor5((targetGPerH * m * c) / 60);
      if (flaskG === 0 || flaskG > MAX_CARBS_PER_FLASK_G) continue;
      const rate = (flaskG * 60) / (m * c);
      const span = m * c;
      const is20 = c === 20;
      const better =
        best === null ||
        rate > best.rate ||
        (rate === best.rate && (span > best.span || (span === best.span && is20 && !best.is20)));
      if (better) best = { rate, span, is20, s: { cadence: c, m, flaskG, portionG: flaskG / m, rateGPerH: rate } };
    }
  }
  return best ? best.s : null;
}

function makeFlask(carbsG: number, product: Product): Flask {
  const p = PRODUCTS[product];
  return { product, carbsG, powderG: roundInt(carbsG * p.powderPerCarb), fgRatio: p.fgRatio };
}

/** One segment of the race with a carb target (0 = no intakes). */
function buildSegment(args: {
  name: SegmentName;
  startMin: number;
  durationMin: number;
  targetGPerH: number;
  sport: Sport;
  product: Product;
  fluidsMlH: number;
}): Segment {
  const { name, startMin, durationMin, targetGPerH, sport, product, fluidsMlH } = args;
  const empty: Segment = {
    name,
    startMin,
    durationMin,
    targetGPerH,
    rateGPerH: 0,
    cadenceMin: null,
    perFlask: 0,
    intakesPerFlask: 0,
    portionG: 0,
    intakes: [],
    flasks: [],
    totalCarbsG: 0,
  };
  const s = targetGPerH > 0 ? pickSchedule(targetGPerH, sport) : null;
  if (!s) return empty;

  const n = Math.ceil(durationMin / s.cadence) - 1;
  if (n <= 0) return { ...empty, rateGPerH: s.rateGPerH, cadenceMin: s.cadence, perFlask: s.flaskG, intakesPerFlask: s.m, portionG: s.portionG };

  const flaskCount = Math.ceil(n / s.m);
  const lastIntakes = n - (flaskCount - 1) * s.m;
  const lastFlaskG = ceil5(lastIntakes * s.portionG);

  const flasks: Flask[] = [];
  for (let i = 0; i < flaskCount; i++) {
    flasks.push(makeFlask(i === flaskCount - 1 ? lastFlaskG : s.flaskG, product));
  }

  // Rounded down to 5 mL so the intakes never add up to more than the hourly fluids figure (and stay within 5 mL/h of it).
  const waterMl = floor5((fluidsMlH * s.cadence) / 60);
  const intakes: Intake[] = [];
  for (let k = 1; k <= n; k++) {
    intakes.push({
      minute: startMin + s.cadence * k,
      segmentMinute: s.cadence * k,
      segment: name,
      carbsG: s.portionG,
      flaskIndex: Math.floor((k - 1) / s.m),
      waterMl,
    });
  }

  return {
    ...empty,
    rateGPerH: s.rateGPerH,
    cadenceMin: s.cadence,
    perFlask: s.flaskG,
    intakesPerFlask: s.m,
    portionG: s.portionG,
    intakes,
    flasks,
    totalCarbsG: round1(n * s.portionG),
  };
}

/** §5.3: single segment, or swim/bike/run for a triathlon. */
export function buildSegments(
  input: FuelPlanInput,
  targetGPerH: number,
  product: Product,
  fluidsMlH: number,
): Segment[] {
  if (input.sport === "triathlon" && input.splits) {
    const { swimMin, bikeMin, runMin } = input.splits;
    const runSegment = buildSegment({
      name: "run",
      startMin: swimMin + bikeMin,
      durationMin: runMin,
      targetGPerH: round5(targetGPerH * TRIATHLON_RUN_TARGET_FACTOR),
      sport: "road_running",
      product,
      fluidsMlH,
    });
    const bikeSegment = buildSegment({ name: "bike", startMin: swimMin, durationMin: bikeMin, targetGPerH, sport: "cycling", product, fluidsMlH });
    // A brick session is bike then run, with no swim.
    if (input.trainingType === "brick") return [bikeSegment, runSegment];
    return [
      buildSegment({ name: "swim", startMin: 0, durationMin: swimMin, targetGPerH: 0, sport: "swimming", product, fluidsMlH }),
      bikeSegment,
      runSegment,
    ];
  }
  return [
    buildSegment({ name: "main", startMin: 0, durationMin: input.durationMin, targetGPerH, sport: input.sport, product, fluidsMlH }),
  ];
}

/** Duration (h) over which fluids are spread: segments with intakes (triathlon: bike + run). */
export function fuelHours(input: FuelPlanInput): number {
  if (input.sport === "triathlon" && input.splits) return (input.splits.bikeMin + input.splits.runMin) / 60;
  return input.durationMin / 60;
}

/** Swimmers and triathletes take 20 g of typetwo shortly before the start (§5.3). */
export function preStartFor(input: FuelPlanInput): { carbsG: 20; minutesBefore: "10–15" } | undefined {
  if (input.sport !== "triathlon" && input.sport !== "swimming") return undefined;
  if (input.trainingType === "brick") return undefined; // no swim
  return { carbsG: PRE_START_CARBS_G as 20, minutesBefore: PRE_START_MINUTES_BEFORE as "10–15" };
}

export function intakeMinutes(segments: Segment[]): number[] {
  return segments.flatMap((s) => s.intakes.map((i) => i.minute));
}

export function totalFlasks(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.flasks.length, 0);
}
