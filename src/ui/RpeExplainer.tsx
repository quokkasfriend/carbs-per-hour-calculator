
import { useId, useState } from "react";
import { useTranslations } from "use-intl";

type Row = { rpe: string; feels: string; talk: string; zone: string };

export function RpeExplainer({ training = false }: { training?: boolean }) {
  const t = useTranslations("FuelPlan.rpeExplainer");
  const tTraining = useTranslations("FuelPlan.training.rpeExplainer");
  const strong = (chunks: React.ReactNode) => <strong className="font-bold">{chunks}</strong>;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rows = t.raw("rows") as Row[];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex cursor-pointer items-center gap-2 self-start text-sm font-semibold text-black underline underline-offset-4"
      >
        {t("toggle")}
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      <div id={panelId} hidden={!open} className="flex flex-col gap-3 rounded-[20px] bg-secondary p-4 text-black">
        <p>{training ? tTraining.rich("intro", { strong }) : t.rich("intro", { strong })}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black/30">
                <th scope="col" className="py-2 pr-3">{t("columns.rpe")}</th>
                <th scope="col" className="py-2 pr-3">{t("columns.feels")}</th>
                <th scope="col" className="py-2 pr-3">{t("columns.talk")}</th>
                <th scope="col" className="py-2">{t("columns.zone")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rpe} className="border-b border-black/20 align-top">
                  <th scope="row" className="py-2 pr-3 font-bold">{r.rpe}</th>
                  <td className="py-2 pr-3">{r.feels}</td>
                  <td className="py-2 pr-3">{r.talk}</td>
                  <td className="py-2">{r.zone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">{t("footnote")}</p>
        {!training && <p className="text-sm font-semibold">{t("typical")}</p>}
      </div>
    </div>
  );
}
