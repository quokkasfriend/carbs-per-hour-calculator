
import { useTranslations } from "use-intl";
import { CONDITION_LEVELS, type ConditionLevel } from "../core/constants";
import { translatorFor, type Translate } from "../core/view";
import type { Context, Sport, TrainingType } from "../core";
import { DropsIcon, FlameIcon, SnowflakeIcon, SunIcon } from "./icons";
import { CheckboxField, DurationField, OptionGroup, RpeScale, SelectField, TextField } from "./fields";
import { hmToMinutes, presetRpe, type FieldErrors, type FormState } from "./formState";
import { RpeExplainer } from "./RpeExplainer";
import { useDuration } from "./useDuration";

const SPORTS: Sport[] = ["road_running", "track", "trail_ultra", "ocr", "triathlon", "cycling", "swimming"];
const TRAINING_TYPES: TrainingType[] = ["easy", "long", "tempo", "intervals", "brick"];
// Not offered for training: ultra is a race format; a brick is the only triathlon training.
const TRAINING_EXCLUDED: Sport[] = ["trail_ultra", "triathlon"];
const CONTEXTS: Context[] = ["race", "training"];

export function RaceStep({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
  errors: FieldErrors;
}) {
  const t = useTranslations("FuelPlan.race");
  const formatDuration = useDuration();
  // Wording for the chosen context ("session" instead of "race" for training).
  const tFull = useTranslations("FuelPlan");
  const tc = translatorFor(form.context === "training" ? "training" : "race", tFull as unknown as Translate);

  const training = form.context === "training";
  const brick = training && form.trainingType === "brick";
  const triathlonRace = form.context === "race" && form.sport === "triathlon";
  // Nothing else is asked until the athlete says what the plan is for.
  const ready = form.context === "race" || (training && form.trainingType !== "");
  const sports = SPORTS.filter((s) => (training ? !TRAINING_EXCLUDED.includes(s) : true));
  const total = (hmToMinutes(form.swim) ?? 0) + (hmToMinutes(form.bike) ?? 0) + (hmToMinutes(form.run) ?? 0);
  const brickTotal = (hmToMinutes(form.bike) ?? 0) + (hmToMinutes(form.run) ?? 0);

  const TEMP_ICONS = { low: <SnowflakeIcon />, medium: <SunIcon />, high: <FlameIcon /> };
  const HUMIDITY_ICONS = { low: <DropsIcon count={1} />, medium: <DropsIcon count={2} />, high: <DropsIcon count={3} /> };
  const levelOptions = (group: "temperature" | "humidity") =>
    CONDITION_LEVELS.map((l: ConditionLevel) => ({
      value: l,
      label: t(`${group}.options.${l}`),
      icon: group === "temperature" ? TEMP_ICONS[l] : HUMIDITY_ICONS[l],
    }));

  return (
    <div className="flex flex-col gap-6">
      <OptionGroup<Context>
        legend={t("context.legend")}
        name="fp-context"
        value={form.context}
        onChange={(context) =>
          update({
            context,
            // Switching context clears choices that only make sense for the other one.
            trainingType: "",
            sport: context === "training" && form.sport !== "" && TRAINING_EXCLUDED.includes(form.sport) ? "" : form.sport,
          })
        }
        options={CONTEXTS.map((c) => ({ value: c, label: t(`context.options.${c}`) }))}
        error={errors.context}
        errorId="fp-context-error"
      />

      {training && (
        <OptionGroup<TrainingType>
          legend={t("trainingType.legend")}
          name="fp-training-type"
          value={form.trainingType}
          onChange={(trainingType) =>
            update({
              trainingType,
              // The type sets the starting RPE (still adjustable below) and a brick is triathlon training.
              rpe: presetRpe(trainingType),
              sport: trainingType === "brick" ? "triathlon" : form.sport !== "" && TRAINING_EXCLUDED.includes(form.sport) ? "" : form.sport,
            })
          }
          options={TRAINING_TYPES.map((x) => ({ value: x, label: t(`trainingType.options.${x}`), help: t(`trainingType.help.${x}`) }))}
          error={errors.trainingType}
          variant="card"
        />
      )}

      {ready && (
        <>
          {!brick && (
            <SelectField<Sport>
              id="fp-sport"
              label={t("sport.label")}
              placeholder={t("sport.placeholder")}
              value={form.sport}
              onChange={(sport) => update({ sport })}
              options={sports.map((s) => ({ value: s, label: t(`sport.options.${s}`) }))}
              error={errors.sport}
            />
          )}

          {brick ? (
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-1 font-semibold text-black">{t("brick.legend")}</legend>
              {(["bike", "run"] as const).map((leg) => (
                <DurationField
                  key={leg}
                  id={`fp-${leg}`}
                  legend={t(`splits.${leg}`)}
                  hoursLabel={t("splits.hours", { leg: t(`splits.${leg}`) })}
                  minutesLabel={t("splits.minutes", { leg: t(`splits.${leg}`) })}
                  value={form[leg]}
                  onChange={(v) => update({ [leg]: v })}
                  error={errors[`splits.${leg}Min`]}
                />
              ))}
              <p className="text-sm text-black/70">{t("brick.hint")}</p>
              {brickTotal > 0 && <p className="font-semibold text-black">{t("splits.total", { time: formatDuration(brickTotal) })}</p>}
            </fieldset>
          ) : triathlonRace ? (
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-1 font-semibold text-black">{t("splits.legend")}</legend>
              {(["swim", "bike", "run"] as const).map((leg) => (
                <DurationField
                  key={leg}
                  id={`fp-${leg}`}
                  legend={t(`splits.${leg}`)}
                  hoursLabel={t("splits.hours", { leg: t(`splits.${leg}`) })}
                  minutesLabel={t("splits.minutes", { leg: t(`splits.${leg}`) })}
                  value={form[leg]}
                  onChange={(v) => update({ [leg]: v })}
                  error={errors[`splits.${leg}Min`]}
                />
              ))}
              <p className="text-sm text-black/70">{t("splits.hint")}</p>
              {total > 0 && <p className="font-semibold text-black">{t("splits.total", { time: formatDuration(total) })}</p>}
            </fieldset>
          ) : (
            <DurationField
              id="fp-duration"
              legend={tc("race.duration.legend")}
              hoursLabel={t("duration.hours")}
              minutesLabel={t("duration.minutes")}
              value={form.duration}
              onChange={(duration) => update({ duration })}
              error={errors.durationMin}
              hint={t("duration.hint")}
            />
          )}

          <div className="flex flex-col gap-2">
            <RpeScale
              id="fp-rpe"
              legend={t("rpe.label")}
              value={form.rpe}
              onChange={(rpe) => update({ rpe })}
              valueText={t("rpe.value", { rpe: form.rpe })}
              lowLabel={t("rpe.low")}
              highLabel={t("rpe.high")}
              hint={tc("race.rpe.hint")}
            />
            <RpeExplainer training={training} />
          </div>

          <TextField
            id="fp-start"
            type="time"
            label={t("startTime.label")}
            value={form.startTime}
            onChange={(startTime) => update({ startTime })}
            hint={t("startTime.hint")}
            error={errors.startTime}
          />

          <OptionGroup<ConditionLevel>
            legend={t("temperature.legend")}
            name="fp-temperature"
            value={form.temperature}
            onChange={(temperature) => update({ temperature })}
            options={levelOptions("temperature")}
            variant="chip"
          />

          <OptionGroup<ConditionLevel>
            legend={t("humidity.legend")}
            name="fp-humidity"
            value={form.humidity}
            onChange={(humidity) => update({ humidity })}
            options={levelOptions("humidity")}
            variant="chip"
          />

          <CheckboxField
            label={tc("race.altitudeOver2500.label")}
            checked={form.altitudeOver2500}
            onChange={(altitudeOver2500) => update({ altitudeOver2500 })}
          />
        </>
      )}
    </div>
  );
}
