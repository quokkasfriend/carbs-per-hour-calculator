
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { buildFuelPlan, parseFuelPlanInput } from "../core";
import type { FuelPlan, FuelPlanInput } from "../core";
import { AthleteStep } from "./AthleteStep";
import { Disclaimer } from "./Disclaimer";
import {
  initialFormState,
  toPayload,
  validateStep,
  type FieldErrors,
  type FormState,
  type StepId,
} from "./formState";
import { HealthStep } from "./HealthStep";
import { PlanResult } from "./PlanResult";
import { RaceStep } from "./RaceStep";

const STEPS: StepId[] = ["race", "athlete", "health"];

/** Form key -> the error keys it can clear (when they differ). */
const ERROR_FIELDS: Record<string, string[]> = {
  duration: ["durationMin"],
  swim: ["splits.swimMin"],
  bike: ["splits.bikeMin"],
  run: ["splits.runMin"],
};

/**
 * Three-step form and result. Answers live only in this component's state:
 * nothing is stored (no cookies, localStorage or sessionStorage) and nothing leaves the browser.
 */
export function FuelPlanTool() {
  const t = useTranslations("FuelPlan");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<{ plan: FuelPlan; input: FuelPlanInput } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Move focus to the new step heading / the result after the user navigates (not on first render).
  useEffect(() => {
    if (!moved.current) return;
    (result ? resultRef.current : headingRef.current)?.focus();
  }, [stepIndex, result]);

  // After a failed "Next", focus the first invalid field.
  useEffect(() => {
    if (Object.keys(errors).length > 0) document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const step = STEPS[stepIndex];
  // First step label follows the choice made there: "Your race", "Your session", or neutral before choosing.
  const stepLabel = (s: StepId) =>
    s !== "race" ? t(`steps.${s}`) : form.context === "race" ? t("steps.race") : form.context === "training" ? t("steps.session") : t("steps.plan");
  const update = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    // An error goes away as soon as its field is edited; changing the plan context starts clean.
    setErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      if ("context" in patch) return {};
      const next = { ...prev };
      for (const key of Object.keys(patch)) for (const field of ERROR_FIELDS[key] ?? [key]) delete next[field];
      return next;
    });
  };

  function goTo(index: number) {
    moved.current = true;
    setErrors({});
    setStepIndex(index);
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    const found = validateStep(form, step);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (stepIndex < STEPS.length - 1) {
      goTo(stepIndex + 1);
      return;
    }
    const parsed = parseFuelPlanInput(toPayload(form));
    if (!parsed.ok) {
      // Should not happen: steps 1 and 2 already validated every required field.
      goTo(0);
      return;
    }
    moved.current = true;
    setResult({ plan: buildFuelPlan(parsed.input), input: parsed.input });
  }

  function edit() {
    moved.current = true;
    setResult(null);
    setErrors({});
    setStepIndex(0);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      {result ? (
        <>
          <PlanResult ref={resultRef} plan={result.plan} input={result.input} onEdit={edit} />
        </>
      ) : (
        <form noValidate onSubmit={next} className="flex flex-col gap-6">
          <ol className="flex gap-2 text-sm" aria-label={t("tool.heading")}>
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === stepIndex ? "step" : undefined}
                className={`flex-1 rounded-full px-3 py-1.5 text-center font-semibold ${
                  i === stepIndex ? "bg-primary text-white" : i < stepIndex ? "bg-black/15 text-black" : "bg-black/5 text-black/60"
                }`}
              >
                {stepLabel(s)}
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-1">
            <p className="text-sm text-black/70">{t("steps.progress", { current: stepIndex + 1, total: STEPS.length })}</p>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-black">
              {stepLabel(step)}
            </h2>
          </div>

          {Object.keys(errors).length > 0 && (
            <p role="alert" className="font-semibold text-accent-foreground">
              {t("errors.summary")}
            </p>
          )}

          {step === "race" && <RaceStep form={form} update={update} errors={errors} />}
          {step === "athlete" && <AthleteStep form={form} update={update} errors={errors} />}
          {step === "health" && <HealthStep form={form} update={update} />}

          <div className="flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-between">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => goTo(stepIndex - 1)}
                className="cursor-pointer rounded-full border-2 border-black px-9 py-4 text-center font-display text-lg text-black transition-transform hover:scale-105"
              >
                {t("nav.back")}
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-primary px-9 py-4 text-center font-display text-lg text-white transition-transform hover:scale-105"
            >
              {stepIndex === STEPS.length - 1 ? t("nav.generate") : t("nav.next")}
            </button>
          </div>
        </form>
      )}

      <Disclaimer />
    </div>
  );
}
