import { useTranslations } from "use-intl";
import { formatDuration } from "../core/format";

/** formatDuration with the unit labels of the current language. */
export function useDuration() {
  const t = useTranslations("FuelPlan.format");
  return (totalMin: number) => formatDuration(totalMin, { hour: t("hour"), minute: t("minute") });
}
