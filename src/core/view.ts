// Display content of a plan as plain strings, shown by the page (PlanResult). Pure: text comes from the `t` function (messages/en.json, namespace FuelPlan).
import { clockTime, formatDuration, formatNumber, powderFor } from "./format";
import type { FuelPlan, FuelPlanInput, Segment, WarningCode, WarningSeverity } from "./types";

export type Translate = (key: string, values?: Record<string, string | number>) => string;

export type ReadyPlan = Extract<FuelPlan, { blocked: false }>;

interface TextLine {
  text: string;
  style: "strong" | "normal" | "muted";
}

export interface PlanView {
  heading: string;
  summary: { heading: string; items: { key: "target" | "blend" | "race" | "intensity" | "totalCarbs"; label: string; value: string; note?: string; badge?: string; big?: boolean }[] };
  timeline: {
    heading: string;
    intro: string;
    empty?: string;
    /** Carbs to take before the start (a plain amount, no product). */
    preStart?: string;
    /** One line per segment: how often and how many grams. */
    rates: string[];
    rows: { elapsed: string; clock?: string; segment?: string; take: string; water?: string; caffeine?: string }[];
  };
  /** "For example, with typetwo..." : the only place where the carbs plan names a product. Absent when no carbs are planned. */
  typetwo?: {
    heading: string;
    intro: string;
    product: { name: string; ratio: string; badge?: string };
    preStart?: string;
    segments: { name?: string; lines: string[]; empty?: string }[];
    benefitsHeading: string;
    benefits: string[];
  };
  hydration: { heading: string; lines: TextLine[] };
  caffeine?: { heading: string; total?: string; doses: string[]; note?: string; off?: string };
  /** `intro` (carb loading / 24 h fuel-up) is for races only. */
  preRace: { heading: string; intro?: string; mealIntro: string; meals: string[]; fluids: string };
  recovery: { heading: string; lines: string[] };
  warnings: {
    heading: string;
    items: { code: WarningCode; severity: WarningSeverity; label: string; text: string }[];
  };
}

const SEVERITY_ORDER = { block: 0, warning: 1, info: 2 } as const;

/**
 * Messages that read differently for a training session ("race" becomes "session"): each one has a
 * twin under `training.<same key>` in messages/en.json. Everything else is shared.
 */
export const TRAINING_OVERRIDES = [
  "race.duration.legend",
  "race.rpe.hint",
  "race.altitudeOver2500.label",
  "health.items.nsaids",
  "rpeExplainer.intro",
  "result.heading",
  "result.summary.race",
  "result.summary.totalCarbs",
  "result.timeline.intro",
  "result.caffeine.during",
  "result.preRace.heading",
  "result.preRace.mealIntro",
  "result.recovery.heading",
  "result.hydration.noFluids",
  "warnings.EAH_RISK",
  "warnings.NSAIDS",
  "warnings.GI_FLOOR",
  "warnings.HIGH_CARB_PRACTICE",
  "warnings.NO_FUEL",
] as const;

/** A translator that picks the training wording when the plan is for a training session. */
export function translatorFor(context: "race" | "training", t: Translate): Translate {
  if (context !== "training") return t;
  const overrides = new Set<string>(TRAINING_OVERRIDES);
  return (key, values) => (overrides.has(key) ? t(`training.${key}`, values) : t(key, values));
}

export function buildWarningItems(
  warnings: { code: WarningCode; severity: WarningSeverity }[],
  t: Translate,
  context: "race" | "training" = "race",
) {
  const tt = translatorFor(context, t);
  return [...warnings]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .map((w) => ({
      code: w.code,
      severity: w.severity,
      label: tt(`result.warnings.severity.${w.severity}`),
      text: tt(`warnings.${w.code}`),
    }));
}

function segmentRate(s: Segment, showName: boolean, t: Translate, fmt: (x: number, d?: number) => string): string {
  const rateKey = s.rateGPerH === s.targetGPerH ? "segmentRate" : "segmentRateTarget";
  const rate = t(`result.timeline.${rateKey}`, {
    cadence: s.cadenceMin ?? 0,
    portion: fmt(s.portionG),
    rate: fmt(s.rateGPerH),
    target: s.targetGPerH,
  });
  return showName ? `${t(`result.segments.${s.name}`)}: ${rate}` : rate;
}

function segmentFlasks(s: Segment, productName: string, showName: boolean, t: Translate, fmt: (x: number, d?: number) => string) {
  const name = showName ? t(`result.segments.${s.name}`) : undefined;
  if (s.flasks.length === 0) return { name, lines: [], empty: t("result.typetwo.noFuel") };

  const last = s.flasks[s.flasks.length - 1];
  const lastDiffers = last.carbsG !== s.perFlask;
  const fullCount = s.flasks.length - (lastDiffers ? 1 : 0);
  const lines: string[] = [];
  if (fullCount > 0) {
    lines.push(
      `${t("result.typetwo.fullFlasks", { count: fullCount, carbs: fmt(s.perFlask), powder: s.flasks[0].powderG })} · ${productName}`,
    );
  }
  if (lastDiffers) {
    lines.push(`${t("result.typetwo.lastFlask", { carbs: fmt(last.carbsG), powder: last.powderG })} · ${productName}`);
  }
  lines.push(t("result.typetwo.portions", { count: s.intakesPerFlask, portion: fmt(s.portionG) }));
  return { name, lines };
}

export function buildPlanView(plan: ReadyPlan, input: FuelPlanInput, translate: Translate, locale = "en"): PlanView {
  const t = translatorFor(plan.context, translate);
  const fmt = (x: number, maxDecimals = 1) => formatNumber(x, maxDecimals, locale);
  const units = { hour: t("format.hour"), minute: t("format.minute") };
  const duration = (min: number) => formatDuration(min, units);
  const productName = t(`result.products.${plan.product}`);
  const multi = plan.segments.length > 1;
  const h = plan.hydration;
  const totalCarbs = plan.segments.reduce((s, x) => s + x.totalCarbsG, 0);
  const totalFlasks = plan.segments.reduce((s, x) => s + x.flasks.length, 0);

  const raceValue = (): string => {
    const time = duration(plan.durationMin);
    if (plan.context === "race") return t("result.summary.raceValue", { sport: t(`race.sport.options.${input.sport}`), time });
    const type = t(`race.trainingType.options.${plan.trainingType}`);
    return plan.trainingType === "brick"
      ? t("result.summary.brickValue", { type, time })
      : t("result.summary.sessionValue", { type, sport: t(`race.sport.options.${input.sport}`), time });
  };

  const when = (minute: number): string | undefined => {
    if (!input.startTime) return undefined;
    const c = clockTime(input.startTime, minute);
    return c.dayOffset > 0 ? t("result.timeline.nextDay", { time: c.time }) : c.time;
  };

  const caffeineAt = new Map<number, number>();
  plan.caffeine?.doses.forEach((d) => {
    if (d.minute >= 0) caffeineAt.set(d.minute, d.mg);
  });

  const timelineRows = plan.segments
    .flatMap((s) => s.intakes.map((i) => ({ s, i })))
    .sort((a, b) => a.i.minute - b.i.minute)
    .map(({ s, i }) => {
      const carbs = fmt(i.carbsG);
      const mg = caffeineAt.get(i.minute);
      return {
        elapsed: duration(i.minute),
        clock: when(i.minute),
        segment: multi ? t(`result.segments.${s.name}`) : undefined,
        take: t("result.timeline.take", { carbs }),
        water: i.waterMl > 0 ? t("result.timeline.water", { ml: i.waterMl }) : undefined,
        caffeine: mg !== undefined ? t("result.timeline.caffeine", { mg }) : undefined,
      };
    });

  const hydrationLines: TextLine[] = [
    {
      text: t(h.estimated ? "result.hydration.sweatRateEstimated" : "result.hydration.sweatRateMeasured", {
        rate: fmt(h.sweatRateLPerH, 2),
      }),
      style: "muted",
    },
  ];
  if (h.fluidsMlH > 0) {
    hydrationLines.push({ text: t("result.hydration.fluids", { ml: h.fluidsMlH }), style: "strong" });
    hydrationLines.push({ text: t("result.hydration.fluidsNote"), style: "normal" });
  } else {
    hydrationLines.push({ text: t("result.hydration.noFluids"), style: "normal" });
  }
  if (h.sodiumMgH > 0) {
    hydrationLines.push({
      text: t("result.hydration.sodium", { mg: h.sodiumMgH, per500: h.sodiumMgPer500ml }),
      style: "strong",
    });
    hydrationLines.push({ text: t("result.hydration.sodiumNote"), style: "normal" });
  } else if (h.fluidsMlH > 0) {
    hydrationLines.push({ text: t("result.hydration.noSodium"), style: "normal" });
  }

  let caffeine: PlanView["caffeine"];
  if (plan.caffeine) {
    caffeine = {
      heading: t("result.caffeine.heading"),
      total: t("result.caffeine.total", { mg: plan.caffeine.totalMg, mgPerKg: fmt(plan.caffeine.mgPerKg) }),
      doses: plan.caffeine.doses.map((d) => {
        if (d.minute < 0) return t("result.caffeine.pre", { mg: d.mg });
        const clock = when(d.minute);
        return t("result.caffeine.during", { mg: d.mg, time: `${duration(d.minute)}${clock ? ` (${clock})` : ""}` });
      }),
      note: t("result.caffeine.note"),
    };
  } else if (input.caffeine) {
    caffeine = { heading: t("result.caffeine.heading"), doses: [], off: t("result.caffeine.off") };
  }

  const pre = plan.preRace;
  const items = buildWarningItems(plan.warnings, t, "race");

  return {
    heading: t("result.heading"),
    summary: {
      heading: t("result.summary.heading"),
      items: [
        { key: "target", label: t("result.summary.target"), value: t("result.summary.targetValue", { target: plan.targetGPerH }), big: true },
        { key: "blend", label: t("result.summary.blend"), value: t(`result.products.ratio.${plan.product}`) },
        {
          key: "race",
          label: t("result.summary.race"),
          value: raceValue(),
        },
        { key: "intensity", label: t("result.summary.intensity"), value: t(`result.summary.intensityValue.${plan.bucket}`) },
        { key: "totalCarbs", label: t("result.summary.totalCarbs"), value: t("result.summary.totalCarbsValue", { g: fmt(totalCarbs) }) },
      ],
    },
    typetwo:
      totalFlasks === 0
        ? undefined
        : {
            heading: t("result.typetwo.heading"),
            intro: t("result.typetwo.intro"),
            product: {
              name: productName,
              ratio: t(`result.products.ratio.${plan.product}`),
            },
            preStart: plan.preStart
              ? t("result.typetwo.preStart", { carbs: plan.preStart.carbsG, powder: powderFor(plan.preStart.carbsG, "typetwo") })
              : undefined,
            segments: plan.segments.map((s) => segmentFlasks(s, productName, multi, t, fmt)),
            benefitsHeading: t("result.typetwo.benefitsHeading"),
            benefits: (["dose", "taste", "absorption", "reusable", "price"] as const).map((k) => t(`result.typetwo.benefits.${k}`)),
          },
    timeline: {
      heading: t("result.timeline.heading"),
      intro: t("result.timeline.intro"),
      preStart: plan.preStart
        ? t("result.timeline.preStart", { minutes: plan.preStart.minutesBefore, carbs: plan.preStart.carbsG })
        : undefined,
      rates: plan.segments.filter((s) => s.flasks.length > 0).map((s) => segmentRate(s, multi, t, fmt)),
      empty: timelineRows.length === 0 ? t("result.timeline.empty") : undefined,
      rows: timelineRows,
    },
    hydration: { heading: t("result.hydration.heading"), lines: hydrationLines },
    caffeine,
    preRace: {
      heading: t("result.preRace.heading"),
      intro:
        pre.loadingGPerDay !== undefined
          ? t("result.preRace.loading", { g: fmt(pre.loadingGPerDay, 0) })
          : pre.fuelUp24hG !== undefined
            ? t("result.preRace.fuelUp", { g: fmt(pre.fuelUp24hG, 0) })
            : undefined,
      mealIntro: t("result.preRace.mealIntro"),
      meals: ([1, 2, 3, 4] as const).map((hrs) =>
        t("result.preRace.mealRow", { hours: hrs, g: fmt(pre.mealGByHours[hrs], 0) }),
      ),
      fluids: t("result.preRace.fluids", { ml4: pre.fluid4hMl, ml2: pre.fluid2hMl }),
    },
    recovery: {
      heading: t("result.recovery.heading"),
      lines: [
        t("result.recovery.carbs", {
          low: fmt(plan.recovery.carbsGPerH[0], 0),
          high: fmt(plan.recovery.carbsGPerH[1], 0),
        }),
        t("result.recovery.fluids"),
        t("result.recovery.protein", { g: fmt(plan.recovery.proteinG, 0) }),
      ],
    },
    warnings: {
      heading: t("result.warnings.heading"),
      items,
    },
  };
}
