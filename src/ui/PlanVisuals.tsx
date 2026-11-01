
import { useTranslations } from "use-intl";
import { buildBalance, type BalanceSeries, type Point } from "../core/balance";
import { formatNumber } from "../core/format";
import type { FuelPlanInput } from "../core";
import type { ReadyPlan } from "../core/view";

/** Big-number tiles for the figures that matter most. */
export function StatTiles({ plan, locale }: { plan: ReadyPlan; locale: string }) {
  const t = useTranslations("FuelPlan.result.visual");
  const total = plan.segments.reduce((s, x) => s + x.totalCarbsG, 0) + (plan.preStart?.carbsG ?? 0);
  const h = plan.hydration;
  const tiles = [
    { label: t("tiles.carbs"), value: t("gValue", { g: plan.targetGPerH }), main: true },
    { label: t("tiles.total"), value: t("gValue", { g: formatNumber(total, 0, locale) }) },
    ...(h.fluidsMlH > 0 ? [{ label: t("tiles.fluids"), value: t("mlValue", { ml: h.fluidsMlH }) }] : []),
    ...(h.sodiumMgH > 0 ? [{ label: t("tiles.sodium"), value: t("mgValue", { mg: h.sodiumMgH }) }] : []),
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
      {tiles.map((x) => (
        <div
          key={x.label}
          className={`flex flex-col gap-1 rounded-[16px] p-4 text-black ${x.main ? "bg-primary text-white" : "border-2 border-black/15 bg-white"}`}
        >
          <dt className="text-sm">{x.label}</dt>
          <dd className="text-2xl font-bold tracking-tight tablet:text-3xl">{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BalanceChart({
  title,
  series,
  duration,
  fmt,
  usedLabel,
  alt,
}: {
  title: string;
  series: BalanceSeries;
  duration: number;
  fmt: (n: number) => string;
  usedLabel: string;
  alt: string;
}) {
  const tv = useTranslations("FuelPlan.result.visual.balance");
  const W = 300;
  const H = 120;
  const maxY = Math.max(series.intakeTotal, series.usedTotal, 1) * 1.08;
  const xy = ([m, v]: Point) => `${((m / duration) * W).toFixed(1)},${(H - (v / maxY) * H).toFixed(1)}`;
  const intake = series.intake.map(xy).join(" ");
  return (
    <figure className="flex flex-col gap-2 rounded-[16px] bg-black/[0.03] p-4">
      <figcaption className="font-bold text-black">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={alt} className="h-28 w-full overflow-visible">
        <line x1="0" y1={H} x2={W} y2={H} stroke="currentColor" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" className="text-black" />
        <polygon points={`0,${H} ${intake} ${W},${H}`} className="fill-primary/10" />
        <polyline points={series.used.map(xy).join(" ")} fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" className="text-black" />
        <polyline points={intake} fill="none" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-primary" />
      </svg>
      <dl className="grid grid-cols-2 gap-2 text-sm text-black">
        <div>
          <dt className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-primary" aria-hidden="true" />
            {tv("intake")}
          </dt>
          <dd className="font-bold">{fmt(series.intakeTotal)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-black/60" aria-hidden="true" />
            {usedLabel}
          </dt>
          <dd className="font-bold">≈ {fmt(series.usedTotal)}</dd>
        </div>
      </dl>
    </figure>
  );
}

/** Carbs, fluids and sodium: what the plan gives you against what you burn or lose. */
export function BalanceCharts({ plan, input, locale }: { plan: ReadyPlan; input: FuelPlanInput; locale: string }) {
  const tv = useTranslations("FuelPlan.result.visual");
  const tb = useTranslations("FuelPlan.result.visual.balance");
  if (plan.durationMin <= 0) return null;
  const b = buildBalance(plan, input);
  const n = (x: number) => formatNumber(x, 0, locale);
  const charts = [
    { key: "carbs", series: b.carbs, fmt: (x: number) => tv("gValue", { g: n(x) }), used: tb("burned") },
    { key: "fluids", series: b.fluids, fmt: (x: number) => tv("mlValue", { ml: n(x) }), used: tb("lost") },
    { key: "sodium", series: b.sodium, fmt: (x: number) => tv("mgValue", { mg: n(x) }), used: tb("lost") },
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <h4 className="font-bold text-black">{tb("heading")}</h4>
      <div className="grid gap-3 tablet:grid-cols-3">
        {charts.map((c) => (
          <BalanceChart
            key={c.key}
            title={tb(c.key)}
            series={c.series}
            duration={plan.durationMin}
            fmt={c.fmt}
            usedLabel={c.used}
            alt={tb("alt", {
              metric: tb(c.key),
              intake: c.fmt(c.series.intakeTotal),
              used: c.fmt(c.series.usedTotal),
              verb: c.used.toLocaleLowerCase(locale),
            })}
          />
        ))}
      </div>
      <p className="text-sm text-black/70">{tb("note")}</p>
    </div>
  );
}

/** One bar per pre-race meal, from 4 hours before to 1 hour before. `labels` come in the order 1 h, 2 h, 3 h, 4 h. */
export function MealBars({ plan, labels }: { plan: ReadyPlan; labels: string[] }) {
  const hours = [4, 3, 2, 1] as const;
  const max = Math.max(...hours.map((h) => plan.preRace.mealGByHours[h]), 1);
  return (
    <ul className="flex flex-col gap-2">
      {hours.map((h) => (
        <li key={h} className="flex flex-col gap-1 text-black">
          <span className="text-sm">{labels[h - 1]}</span>
          <span className="h-3 rounded-full bg-black/5" aria-hidden="true">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(plan.preRace.mealGByHours[h] / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Recovery carbs and protein as two big numbers, each with its sentence underneath. */
export function RecoveryTiles({ plan, locale, carbsLine, proteinLine }: { plan: ReadyPlan; locale: string; carbsLine: string; proteinLine: string }) {
  const t = useTranslations("FuelPlan.result.visual");
  const [low, high] = plan.recovery.carbsGPerH;
  const tiles = [
    { value: t("perHourRange", { low: formatNumber(low, 0, locale), high: formatNumber(high, 0, locale) }), line: carbsLine },
    { value: t("gValue", { g: formatNumber(plan.recovery.proteinG, 0, locale) }), line: proteinLine },
  ];
  return (
    <div className="grid gap-3 tablet:grid-cols-2">
      {tiles.map((x) => (
        <div key={x.value} className="flex flex-col gap-1 rounded-[16px] bg-black/[0.03] p-4 text-black">
          <span className="text-2xl font-bold tracking-tight">{x.value}</span>
          <span className="text-sm">{x.line}</span>
        </div>
      ))}
    </div>
  );
}
