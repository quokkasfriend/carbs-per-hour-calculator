
import { useId, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import type { FieldError } from "./formState";
import { useDuration } from "./useDuration";

const inputClass =
  "w-full rounded-full border-2 border-black bg-white px-5 py-3 text-base text-black placeholder:text-black/50 aria-[invalid=true]:border-accent-foreground";

/** Message for a field error. `minutes` formats the range as a duration. */
function ErrorText({ id, error, minutes }: { id: string; error?: FieldError; minutes?: boolean }) {
  const t = useTranslations("FuelPlan.errors");
  const formatDuration = useDuration();
  if (!error) return null;
  let text: string;
  if (error.type === "range") {
    text = minutes
      ? t("durationRange", { min: formatDuration(error.min), max: formatDuration(error.max) })
      : t("range", { min: error.min, max: error.max });
  } else {
    text = t(error.type);
  }
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-accent-foreground">
      {text}
    </p>
  );
}

function Hint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm text-black/70">
      {children}
    </p>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  step = "any",
  min,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: FieldError;
  hint?: ReactNode;
  step?: string;
  min?: number;
  max?: number;
}) {
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-black">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined}
        className={inputClass}
      />
      {hint && <Hint id={hintId}>{hint}</Hint>}
      <ErrorText id={errId} error={error} />
    </div>
  );
}

export function TextField({
  id,
  label,
  type,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: string;
  type: "time" | "text";
  value: string;
  onChange: (v: string) => void;
  error?: FieldError;
  hint?: ReactNode;
}) {
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-black">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined}
        className={inputClass}
      />
      {hint && <Hint id={hintId}>{hint}</Hint>}
      <ErrorText id={errId} error={error} />
    </div>
  );
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: "" | T;
  onChange: (v: "" | T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  error?: FieldError;
}) {
  const errId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-black">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as "" | T)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={`${inputClass} cursor-pointer`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorText id={errId} error={error} />
    </div>
  );
}

/** Hours + minutes inputs for a duration. `errorKey` ids are derived from `id`. */
export function DurationField({
  id,
  legend,
  hoursLabel,
  minutesLabel,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  legend: string;
  hoursLabel: string;
  minutesLabel: string;
  value: { h: string; m: string };
  onChange: (v: { h: string; m: string }) => void;
  error?: FieldError;
  hint?: ReactNode;
}) {
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 font-semibold text-black">{legend}</legend>
      <div className="flex gap-3">
        <input
          id={`${id}-h`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          aria-label={hoursLabel}
          placeholder="h"
          value={value.h}
          onChange={(e) => onChange({ ...value, h: e.target.value })}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={inputClass}
        />
        <input
          id={`${id}-m`}
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          step={1}
          aria-label={minutesLabel}
          placeholder="min"
          value={value.m}
          onChange={(e) => onChange({ ...value, m: e.target.value })}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={inputClass}
        />
      </div>
      {hint && <Hint id={hintId}>{hint}</Hint>}
      <ErrorText id={errId} error={error} minutes />
    </fieldset>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-black">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={hint ? hintId : undefined}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-primary"
        />
        <span>{label}</span>
      </label>
      {hint && (
        <p id={hintId} className="pl-8 text-sm text-black/70">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Pill-style radio group. */
export function OptionGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  error,
  errorId,
  hint,
  variant = "pill",
}: {
  legend: string;
  name: string;
  value: "" | T;
  onChange: (v: T) => void;
  options: { value: T; label: string; help?: string; icon?: ReactNode }[];
  error?: FieldError;
  errorId?: string;
  hint?: ReactNode;
  /** pill: wrapping pills · chip: equal-width tiles with an icon · card: tiles with the help text inside */
  variant?: "pill" | "chip" | "card";
}) {
  const id = useId();
  const errId = errorId ?? `${id}-error`;
  const hintId = `${id}-hint`;
  const selectedHelp = variant === "card" ? undefined : options.find((o) => o.value === value)?.help;
  const tile =
    "flex h-full flex-col gap-1 rounded-[16px] border-2 border-black/20 bg-white p-3 text-black transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black";
  const layout =
    variant === "pill"
      ? "flex flex-wrap gap-2"
      : variant === "chip"
        ? "grid grid-cols-3 gap-2"
        : "grid gap-2 tablet:grid-cols-2";
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={[hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-1 font-semibold text-black">{legend}</legend>
      {hint && <Hint id={hintId}>{hint}</Hint>}
      <div className={layout}>
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            {variant === "pill" ? (
              <span className="inline-flex rounded-full border-2 border-black bg-white px-4 py-2 text-black transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black">
                {o.label}
              </span>
            ) : variant === "chip" ? (
              <span className={`${tile} items-center text-center`}>
                {o.icon}
                <span className="font-bold">{o.label.split(" · ")[0]}</span>
                {o.label.includes(" · ") && <span className="text-xs">{o.label.split(" · ")[1]}</span>}
              </span>
            ) : (
              <span className={tile}>
                <span className="font-bold">{o.label}</span>
                {o.help && <span className="text-sm">{o.help}</span>}
              </span>
            )}
          </label>
        ))}
      </div>
      {selectedHelp && <p className="text-sm text-black/70">{selectedHelp}</p>}
      <ErrorText id={errId} error={error} />
    </fieldset>
  );
}

/** 1–10 effort scale: ten tiles whose colour deepens with the effort. */
export function RpeScale({
  id,
  legend,
  value,
  onChange,
  valueText,
  lowLabel,
  highLabel,
  hint,
}: {
  id: string;
  legend: string;
  value: number;
  onChange: (v: number) => void;
  valueText: string;
  lowLabel: string;
  highLabel: string;
  hint: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-hint`}>
      <legend className="mb-1 font-semibold text-black">
        {legend}: <span className="font-bold">{valueText}</span>
      </legend>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={id} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <span
              className={`flex h-12 items-center justify-center rounded-[10px] border-2 font-bold text-black transition peer-checked:scale-110 peer-checked:border-black peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black ${
                n > value ? "border-transparent opacity-40" : "border-transparent"
              } ${n >= 7 ? "text-white" : ""}`}
              style={{ backgroundColor: `color-mix(in srgb, var(--color-primary) ${8 + n * 9}%, white)` }}
            >
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-sm text-black/70" aria-hidden="true">
        <span>1 · {lowLabel}</span>
        <span>10 · {highLabel}</span>
      </div>
      <p id={`${id}-hint`} className="text-sm text-black/70">{hint}</p>
    </fieldset>
  );
}
