
import { useTranslations } from "use-intl";
import type { CaffeineSensitivity, GiHistory, Level, SaltySweater, Sex } from "../core";
import { CheckboxField, NumberField, OptionGroup } from "./fields";
import type { FieldErrors, FormState } from "./formState";

const SEXES: Sex[] = ["female", "male", "prefer_not_to_say"];
const LEVELS: Level[] = ["beginner", "recreational", "trained", "elite"];
const GI: GiHistory[] = ["none", "mild", "moderate", "severe"];
const SALTY: SaltySweater[] = ["yes", "no", "dont_know"];
const SENSITIVITY: CaffeineSensitivity[] = ["low", "normal", "high"];

export function AthleteStep({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
  errors: FieldErrors;
}) {
  const t = useTranslations("FuelPlan.athlete");
  // A field inside the optional block with an error must not stay hidden.
  const advancedOpen = ["toleratedGPerH", "sweatRateLPerH", "sweatSodiumMgPerL"].some((k) => errors[k]) || undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 tablet:grid-cols-2">
        <NumberField
          id="fp-weight"
          label={t("weightKg.label")}
          value={form.weightKg}
          onChange={(weightKg) => update({ weightKg })}
          error={errors.weightKg}
        />
        <NumberField
          id="fp-age"
          label={t("age.label")}
          step="1"
          value={form.age}
          onChange={(age) => update({ age })}
          error={errors.age}
        />
      </div>

      <OptionGroup<Sex>
        legend={t("sex.label")}
        name="fp-sex"
        value={form.sex}
        onChange={(sex) => update({ sex })}
        options={SEXES.map((s) => ({ value: s, label: t(`sex.options.${s}`) }))}
        error={errors.sex}
      />

      <OptionGroup<Level>
        legend={t("level.label")}
        name="fp-level"
        value={form.level}
        onChange={(level) => update({ level })}
        options={LEVELS.map((l) => ({ value: l, label: t(`level.options.${l}`), help: t(`level.help.${l}`) }))}
        error={errors.level}
        variant="card"
      />

      <CheckboxField
        label={t("caffeine.label")}
        checked={form.caffeine}
        onChange={(caffeine) => update({ caffeine })}
      />

      {form.caffeine && (
        <OptionGroup<CaffeineSensitivity>
          legend={t("caffeineSensitivity.label")}
          name="fp-caffeine-sensitivity"
          value={form.caffeineSensitivity}
          onChange={(caffeineSensitivity) => update({ caffeineSensitivity })}
          options={SENSITIVITY.map((s) => ({ value: s, label: t(`caffeineSensitivity.options.${s}`) }))}
        />
      )}

      <details open={advancedOpen} className="group rounded-[16px] border-2 border-black/15 p-4">
        <summary className="flex cursor-pointer list-none flex-col [&::-webkit-details-marker]:hidden">
          <span className="font-bold text-black">{t("advanced.summary")}</span>
          <span className="text-sm text-black/70">{t("advanced.hint")}</span>
        </summary>
        <div className="flex flex-col gap-6 pt-4">
          <NumberField
            id="fp-tolerated"
            label={t("toleratedGPerH.label")}
            step="1"
            value={form.toleratedGPerH}
            onChange={(toleratedGPerH) => update({ toleratedGPerH })}
            hint={t("toleratedGPerH.help")}
            error={errors.toleratedGPerH}
          />

          <CheckboxField
            label={t("gutTrained.label")}
            hint={t("gutTrained.help")}
            checked={form.gutTrained}
            onChange={(gutTrained) => update({ gutTrained })}
          />

          <OptionGroup<GiHistory>
            legend={t("giHistory.label")}
            name="fp-gi"
            value={form.giHistory}
            onChange={(giHistory) => update({ giHistory })}
            options={GI.map((g) => ({ value: g, label: t(`giHistory.options.${g}`) }))}
          />

          <NumberField
            id="fp-sweat-rate"
            label={t("sweatRateLPerH.label")}
            value={form.sweatRateLPerH}
            onChange={(sweatRateLPerH) => update({ sweatRateLPerH })}
            hint={t("sweatRateLPerH.help")}
            error={errors.sweatRateLPerH}
          />

          <NumberField
            id="fp-sweat-sodium"
            label={t("sweatSodiumMgPerL.label")}
            step="1"
            value={form.sweatSodiumMgPerL}
            onChange={(sweatSodiumMgPerL) => update({ sweatSodiumMgPerL })}
            hint={t("sweatSodiumMgPerL.help")}
            error={errors.sweatSodiumMgPerL}
          />

          <OptionGroup<SaltySweater>
            legend={t("saltySweater.label")}
            name="fp-salty"
            hint={t("saltySweater.help")}
            value={form.saltySweater}
            onChange={(saltySweater) => update({ saltySweater })}
            options={SALTY.map((s) => ({ value: s, label: t(`saltySweater.options.${s}`) }))}
          />
        </div>
      </details>
    </div>
  );
}
