
import { forwardRef, useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";
import { BalanceCharts, MealBars, RecoveryTiles, StatTiles } from "./PlanVisuals";
import { buildPlanView, buildWarningItems, type ReadyPlan, type Translate } from "../core/view";
import type { FuelPlan, FuelPlanInput } from "../core";

const h3 = "text-xl font-bold tracking-tight text-black";
const card = "flex flex-col gap-3 rounded-[20px] border-2 border-black/15 bg-white p-5";

function WarningsList({ items }: { items: ReturnType<typeof buildWarningItems> }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((w) => (
        <li
          key={w.code}
          className={`rounded-[12px] border-l-8 p-4 text-black ${
            w.severity === "info" ? "border-black/30 bg-black/5" : "border-primary bg-primary/10"
          }`}
        >
          <span className="font-bold">{w.label}: </span>
          {w.text}
        </li>
      ))}
    </ul>
  );
}

/** Closed-by-default section. */
function Collapsible({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <details aria-labelledby={id} className={`${card} group`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span id={id} className={h3}>{heading}</span>
        <span aria-hidden="true" className="text-2xl leading-none text-black transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="flex flex-col gap-3 pt-3">{children}</div>
    </details>
  );
}

const lineClass = { strong: "font-bold text-black", normal: "text-black", muted: "text-sm text-black/70" } as const;

export const PlanResult = forwardRef<HTMLHeadingElement, { plan: FuelPlan; input: FuelPlanInput; onEdit: () => void }>(
  function PlanResult({ plan, input, onEdit }, headingRef) {
    const t = useTranslations("FuelPlan");
    const tr = t as unknown as Translate;

    if (plan.blocked) {
      return (
        <div className="flex flex-col gap-5">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-black">
            {t("result.blockedHeading")}
          </h2>
          <WarningsList items={buildWarningItems(plan.warnings, tr)} />
          <EditLink onEdit={onEdit} label={t("nav.edit")} />
        </div>
      );
    }
    return <ReadyResult ref={headingRef} plan={plan} input={input} onEdit={onEdit} />;
  },
);

function EditLink({ onEdit, label }: { onEdit: () => void; label: string }) {
  return (
    <button type="button" onClick={onEdit} className="cursor-pointer self-start text-sm font-semibold text-black underline underline-offset-4">
      {label}
    </button>
  );
}

const ReadyResult = forwardRef<HTMLHeadingElement, { plan: ReadyPlan; input: FuelPlanInput; onEdit: () => void }>(
  function ReadyResult({ plan, input, onEdit }, headingRef) {
    const t = useTranslations("FuelPlan");
    const locale = useLocale();
    const view = useMemo(() => buildPlanView(plan, input, t as unknown as Translate, locale), [plan, input, t, locale]);

    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-black">
            {view.heading}
          </h2>
          <EditLink onEdit={onEdit} label={t("nav.edit")} />
        </div>

        <StatTiles plan={plan} locale={locale} />

        <section aria-labelledby="fp-summary" className={`${card} bg-secondary`}>
          <h3 id="fp-summary" className={h3}>{view.summary.heading}</h3>
          <dl className="grid gap-x-6 gap-y-3 text-black tablet:grid-cols-2">
            {view.summary.items.filter((item) => item.key === "blend" || item.key === "intensity").map((item) => (
              <div key={item.label}>
                <dt className="text-sm">{item.label}</dt>
                <dd className={item.big ? "text-3xl font-bold tracking-tight" : "font-bold"}>
                  {item.value}
                  {item.badge && (
                    <span className="ml-2 rounded-full bg-accent px-3 py-0.5 text-sm text-accent-foreground">{item.badge}</span>
                  )}
                  {item.note && <span className="block text-sm font-normal">{item.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="fp-timeline" className={card}>
          <h3 id="fp-timeline" className={h3}>{view.timeline.heading}</h3>
          {view.timeline.preStart && <p className="font-semibold text-black">{view.timeline.preStart}</p>}
          {view.timeline.rates.length > 0 && (
            <ul className="list-disc pl-5 font-semibold text-black">
              {view.timeline.rates.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {view.timeline.empty ? (
            <p className="text-black">{view.timeline.empty}</p>
          ) : (
            <details className="group">
              <summary className="cursor-pointer font-semibold text-black underline underline-offset-4">
                {t("result.visual.scheduleSummary", { count: view.timeline.rows.length })}
              </summary>
            <ol className="divide-y divide-black/10">
              {view.timeline.rows.map((r, idx) => (
                <li key={idx} className="flex flex-col gap-1 py-3 text-black tablet:flex-row tablet:gap-6">
                  <div className="shrink-0 font-bold tablet:w-40">
                    {r.elapsed}
                    {r.clock && <span className="block text-sm font-normal text-black/70">{r.clock}</span>}
                  </div>
                  <div>
                    {r.segment && <span className="mr-2 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold">{r.segment}</span>}
                    {r.segment && " "}
                    {r.take}
                    {r.water && <span className="block text-sm text-black/70">{r.water}</span>}
                    {r.caffeine && <span className="block text-sm font-semibold">{r.caffeine}</span>}
                  </div>
                </li>
              ))}
            </ol>
            </details>
          )}
        </section>

        <section aria-label={t("result.visual.balance.heading")} className={card}>
          <BalanceCharts plan={plan} input={input} locale={locale} />
        </section>

        {view.typetwo && (
          <Collapsible id="fp-typetwo" heading={view.typetwo.heading}>
            <p className="text-black">{view.typetwo.intro}</p>
            <p className="font-bold text-black">
              {view.typetwo.product.name}
              {view.typetwo.product.badge && (
                <span className="ml-2 rounded-full bg-accent px-3 py-0.5 text-sm text-accent-foreground">{view.typetwo.product.badge}</span>
              )}
              <span className="block text-sm font-normal">{view.typetwo.product.ratio}</span>
            </p>
            {view.typetwo.preStart && <p className="font-semibold text-black">{view.typetwo.preStart}</p>}
            {view.typetwo.segments.map((s, idx) => (
              <div key={s.name ?? idx} className="flex flex-col gap-1 border-t border-black/10 pt-3 text-black">
                {s.name && <h4 className="font-bold">{s.name}</h4>}
                {s.empty && <p>{s.empty}</p>}
                {s.lines.length > 0 && (
                  <ul className="list-disc pl-5">
                    {s.lines.map((l) => (
                      <li key={l} className="font-semibold">{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Collapsible>
        )}

        <Collapsible id="fp-hydration" heading={view.hydration.heading}>
          {view.hydration.lines.map((l) => (
            <p key={l.text} className={lineClass[l.style]}>{l.text}</p>
          ))}
        </Collapsible>

        {view.caffeine && (
          <Collapsible id="fp-caffeine" heading={view.caffeine.heading}>
            {view.caffeine.off && <p className="text-black">{view.caffeine.off}</p>}
            {view.caffeine.total && <p className="font-bold text-black">{view.caffeine.total}</p>}
            {view.caffeine.doses.length > 0 && (
              <ul className="list-disc pl-5 text-black">
                {view.caffeine.doses.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            {view.caffeine.note && <p className="text-sm text-black">{view.caffeine.note}</p>}
          </Collapsible>
        )}

        <Collapsible id="fp-prerace" heading={view.preRace.heading}>
          {view.preRace.intro && <p className="text-black">{view.preRace.intro}</p>}
          <p className="text-black">{view.preRace.mealIntro}</p>
          <MealBars plan={plan} labels={view.preRace.meals} />
          <p className="text-black">{view.preRace.fluids}</p>
        </Collapsible>

        <Collapsible id="fp-recovery" heading={view.recovery.heading}>
          <RecoveryTiles plan={plan} locale={locale} carbsLine={view.recovery.lines[0]} proteinLine={view.recovery.lines[2]} />
          <p className="text-black">{view.recovery.lines[1]}</p>
        </Collapsible>

        <section aria-labelledby="fp-warnings" className="flex flex-col gap-3">
          <h3 id="fp-warnings" className={h3}>{view.warnings.heading}</h3>
          <WarningsList items={view.warnings.items} />
        </section>
      </div>
    );
  },
);
