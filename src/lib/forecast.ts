import type { MonthlyFlow } from "@/types/database";

export interface ForecastPoint {
  month: number;
  year: number;
  /** Center of the projection. */
  mid: number;
  /** Lower bound of the ~80% confidence band. */
  lower: number;
  /** Upper bound of the ~80% confidence band. */
  upper: number;
}

const ALPHA = 0.6;
const BETA = 0.3;
// 1.28σ ≈ 80% two-sided band on the residuals — enough to feel like a "likely
// range" without overpromising. Scales with √h so the cone widens further out.
const Z = 1.28;

/**
 * Holt double exponential smoothing applied to net flow (income − expense).
 *
 * Returns one forecast point per month for the next `horizon` months, with a
 * symmetric confidence band built from the residuals of the in-sample fit.
 *
 * Returns an empty array if there is not enough history (< 3 months).
 */
export function forecastNetFlow(
  history: MonthlyFlow[],
  horizon = 2,
): ForecastPoint[] {
  if (!Array.isArray(history) || history.length < 3) return [];

  const series = history.map((m) => m.income - m.expense);

  let level = series[0];
  let trend = series[1] - series[0];
  const residuals: number[] = [];

  for (let t = 1; t < series.length; t++) {
    const fit = level + trend;
    residuals.push(series[t] - fit);
    const prevLevel = level;
    level = ALPHA * series[t] + (1 - ALPHA) * (level + trend);
    trend = BETA * (level - prevLevel) + (1 - BETA) * trend;
  }

  const variance =
    residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length);
  const sigma = Math.sqrt(variance);

  const last = history[history.length - 1];
  const out: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const d = new Date(last.year, last.month - 1 + h, 1);
    const mid = level + h * trend;
    const spread = Z * sigma * Math.sqrt(h);
    out.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      mid,
      lower: mid - spread,
      upper: mid + spread,
    });
  }
  return out;
}
