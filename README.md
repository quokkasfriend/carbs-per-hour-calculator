# Carbs per hour calculator

A free, open-source endurance fuelling calculator by [typetwo](https://typetwo.com). Tell it about your race or training session and about yourself, and it builds a plan with:

- **carbs per hour** and when to take each portion
- **fluids and sodium** per hour
- **caffeine** dose and timing
- pre-race and recovery guidance
- warnings for heat, altitude, gut issues and health conditions

It runs entirely in the browser. Nothing is sent anywhere or stored.

> **Not medical advice.** This is general guidance based on published sports-nutrition research. It does not replace a doctor or a registered sports dietitian. People with diabetes, kidney or heart disease, high blood pressure, gastrointestinal conditions, or who are pregnant or on regular medication should get a plan from a professional. The calculator blocks the plan for some of these cases.

## Run it

```bash
npm install
npm run dev
```

Build a static site into `dist/` (it works from any path, for example GitHub Pages):

```bash
npm run build
```

## How it is organised

```
src/core/       the calculation engine: pure TypeScript, no React, fully tested
src/ui/         the three-step form and the result page (React + Tailwind)
src/messages/   all user-facing text (English)
```

You can use `src/core/` on its own:

```ts
import { buildFuelPlan, parseFuelPlanInput } from "./src/core";

const parsed = parseFuelPlanInput({
  sport: "road_running",
  durationMin: 210,
  rpe: 6,
  weightKg: 70,
  sex: "male",
  age: 35,
  level: "recreational",
  tempC: 18,
  humidityPct: 50,
});
if (parsed.ok) {
  const plan = buildFuelPlan(parsed.input); // same input, same plan
}
```

## Where the numbers come from

The plan follows published sports-nutrition guidelines. The exact numbers are our own rules of thumb built on them, so test everything in training.

- **Carbohydrates during exercise**: Jeukendrup 2014, *Sports Med* 44(S1):S25–33. Thomas, Erdman & Burke 2016, *Med Sci Sports Exerc* 48(3):543–568. Morton et al. 2026, *J Nutr* 156(5):101442. Smith et al. 2013, *Med Sci Sports Exerc* 45(2):336–341. Podlogar et al. 2022, *Eur J Appl Physiol*. Rowlands et al. 2015, *Sports Med* 45:1561–1576.
- **Ultra-endurance**: Tiller et al. 2019, *J Int Soc Sports Nutr* 16:50.
- **The gut**: Costa et al. 2017, *Aliment Pharmacol Ther* 46:246–265. Martinez et al. 2023, *Sports Med* 53(6):1175–1200. Sports Dietitians Australia / Ultra Sports Science Foundation 2025, *Sports Med*.
- **Fluids and sodium**: Sawka et al. 2007, *Med Sci Sports Exerc* 39(2):377–390. Hew-Butler et al. 2015, *Clin J Sport Med* 25(4):303–320. Barnes et al. 2019, *J Sports Sci* 37(20):2356–2366. Baker 2017, *Sports Med* 47(S1):111–128. Baker et al. 2022, *J Appl Physiol*. McCubbin et al. 2020, *IJSNEM* 30(1):83–98. McCubbin 2025, *Performance Nutrition* 1:11.
- **Before and after the race**: Burke et al. 2011, *J Sports Sci* 29(S1):S17–27.
- **Caffeine**: Guest et al. 2021, *J Int Soc Sports Nutr* 18:1.
- **Safety**: Mountjoy et al. 2023, *Br J Sports Med* 57:1073–1097 (RED-S). Riddell et al. 2017, *Lancet Diabetes Endocrinol* 5(5):377–390 (type 1 diabetes, cited only as the reason for the block).

## Also open source

- Carb loading calculator: the days-before-the-race plan, day by day, with foods and portions (`carb-loading-calculator`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). The typetwo name and logo are trademarks of typetwo and are not covered by the license.

The example in the plan that mentions typetwo flasks and powder is specific to typetwo products. Remove or adapt `typetwo` in `src/core/` and `src/messages/en.json` if you reuse the engine with other products.
