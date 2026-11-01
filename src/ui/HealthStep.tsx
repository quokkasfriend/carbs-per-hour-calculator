
import { useTranslations } from "use-intl";
import { translatorFor, type Translate } from "../core/view";
import { CheckboxField } from "./fields";
import { HEALTH_KEYS, type FormState } from "./formState";

export function HealthStep({
  form,
  update,
}: {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
}) {
  const t = useTranslations("FuelPlan.health");
  const tc = translatorFor(form.context === "training" ? "training" : "race", useTranslations("FuelPlan") as unknown as Translate);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-black">{t("intro")}</p>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold text-black">{t("legend")}</legend>
        {HEALTH_KEYS.map((key) => (
          <CheckboxField
            key={key}
            label={key === "nsaids" ? tc("health.items.nsaids") : t(`items.${key}`)}
            checked={form.health[key]}
            onChange={(v) => update({ health: { ...form.health, [key]: v } })}
          />
        ))}
      </fieldset>
    </div>
  );
}
