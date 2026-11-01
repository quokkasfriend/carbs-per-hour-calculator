import { useTranslations } from "use-intl";
import { FuelPlanTool } from "./ui/FuelPlanTool";

const TYPETWO_URL = "https://typetwo.eu";

export function App() {
  const t = useTranslations("FuelPlan");
  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="w-full bg-shade print:hidden">
        <div className="flex items-center px-8 py-4 tablet:px-12 desktop:px-20">
          <a href={TYPETWO_URL} className="shrink-0">
            <img src="./logo-dark.png" alt="typetwo" width={80} height={80} className="h-16 w-auto" />
          </a>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center">
        <section className="flex w-full flex-col items-center gap-6 bg-primary px-6 py-12 text-center tablet:px-12 tablet:py-16 desktop:px-25 print:hidden">
          <h1 className="font-display text-[30px] tracking-tight text-white tablet:text-[38px] desktop:text-[52px]">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-base tracking-tight text-white desktop:text-lg">
            {t.rich("hero.body", { strong: (chunks) => <strong className="font-bold">{chunks}</strong> })}
          </p>
        </section>

        <section className="flex w-full flex-col items-center gap-8 bg-white px-6 py-12 tablet:px-12 tablet:py-16 desktop:px-25">
          <FuelPlanTool />
        </section>
      </main>

      <footer className="w-full bg-shade px-6 py-8 text-center text-sm text-white print:hidden">
        <p>
          Open source under the MIT license. Made by{" "}
          <a href={TYPETWO_URL} className="font-semibold underline">
            typetwo
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
