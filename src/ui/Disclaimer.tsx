import { useTranslations } from "use-intl";

export function Disclaimer() {
  const t = useTranslations("FuelPlan.disclaimer");
  const strong = (chunks: React.ReactNode) => <strong className="font-bold">{chunks}</strong>;
  return (
    <aside aria-labelledby="fp-disclaimer-heading" className="flex w-full max-w-3xl flex-col gap-3 rounded-[20px] border-2 border-black p-5 text-sm text-black">
      <h2 id="fp-disclaimer-heading" className="text-base font-bold tracking-tight">
        {t("heading")}
      </h2>
      <p>{t("p1")}</p>
      <p>{t.rich("p2", { strong })}</p>
      <p>{t.rich("p3", { strong })}</p>
      <p>{t("p4")}</p>
    </aside>
  );
}
