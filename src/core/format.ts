// Pure display helpers shared by the page and the email.
import { PRODUCTS } from "./constants";
import { roundInt } from "./rounding";

/** 11.6667 -> "11.7" ("11,7" in Italian and German), 25 -> "25". No thousands separator. */
export function formatNumber(x: number, maxDecimals = 1, locale = "en"): string {
  const f = 10 ** maxDecimals;
  const r = Math.floor(x * f + 0.5 + 1e-9) / f;
  const s = String(r);
  return locale === "en" ? s : s.replace(".", ",");
}

export interface DurationUnits {
  hour: string;
  minute: string;
}
const EN_UNITS: DurationUnits = { hour: "h", minute: "min" };

/** 45 -> "45 min", 200 -> "3 h 20 min", 180 -> "3 h". */
export function formatDuration(totalMin: number, units: DurationUnits = EN_UNITS): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} ${units.minute}`;
  return m === 0 ? `${h} ${units.hour}` : `${h} ${units.hour} ${m} ${units.minute}`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Clock time of a race minute, "14:20", plus how many days after the start day. */
export function clockTime(startTime: string, minute: number): { time: string; dayOffset: number } {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + minute;
  const dayOffset = Math.floor(total / 1440);
  const inDay = ((total % 1440) + 1440) % 1440;
  return { time: `${pad2(Math.floor(inDay / 60))}:${pad2(inDay % 60)}`, dayOffset };
}

/** Grams of powder for a given amount of carbs of a product. */
export function powderFor(carbsG: number, product: keyof typeof PRODUCTS): number {
  return roundInt(carbsG * PRODUCTS[product].powderPerCarb);
}
