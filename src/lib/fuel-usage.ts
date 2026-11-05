export type FuelReadingInput = {
  fuel?: string | number | null;
  start?: string | number | null;
  end?: string | number | null;
  hoursUsed?: string | number | null;
  targetLph?: string | number | null;
};

export type FuelUsageStats = {
  diesel: number;
  hours: number;
  actualAvg: number;
  expectedFuel: number | null;
  difference: number | null;
};

function num(value?: string | number | null) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function readingHours(start?: string | number | null, end?: string | number | null, stored?: string | number | null) {
  const saved = num(stored);
  if (saved != null) return Math.round(saved * 100) / 100;
  const opening = num(start);
  const closing = num(end);
  if (opening == null || closing == null) return 0;
  return Math.round((closing - opening) * 100) / 100;
}

/** Actual average is litres per hour. Expected diesel is hours × company target (L/hr). */
export function fuelUsageStats(input: FuelReadingInput): FuelUsageStats {
  const diesel = num(input.fuel) ?? 0;
  const hours = readingHours(input.start, input.end, input.hoursUsed);
  const actualAvg = hours > 0 ? diesel / hours : 0;
  const target = num(input.targetLph);
  const expectedFuel = target != null && hours > 0 ? hours * target : null;
  const difference = expectedFuel != null ? diesel - expectedFuel : null;
  return { diesel, hours, actualAvg, expectedFuel, difference };
}

export type FuelUsageSummary = {
  totalDiesel: number;
  totalHours: number;
  opening: number | null;
  closing: number | null;
  actualAvg: number | null;
  target: number | null;
  expectedFuel: number | null;
  difference: number | null;
  withinTarget: boolean | null;
};

export function fuelUsageSummary(
  rows: Array<{ logged_date?: string | null; fuel?: string | number | null; start?: string | number | null; end?: string | number | null; hoursUsed?: string | number | null }>,
  targetLph?: string | number | null,
): FuelUsageSummary {
  const ordered = [...rows].sort((a, b) => String(a.logged_date || "").localeCompare(String(b.logged_date || "")));
  let totalDiesel = 0;
  let summedHours = 0;
  for (const row of ordered) {
    const stats = fuelUsageStats({ ...row, targetLph });
    totalDiesel += stats.diesel;
    summedHours += stats.hours;
  }
  const opening = ordered.length ? num(ordered[0].start) : null;
  const closing = ordered.length ? num(ordered[ordered.length - 1].end) : null;
  const spanHours = opening != null && closing != null ? Math.round((closing - opening) * 100) / 100 : null;
  const totalHours = spanHours != null && spanHours >= 0 ? spanHours : Math.round(summedHours * 100) / 100;
  const target = num(targetLph);
  const actualAvg = totalHours > 0 ? totalDiesel / totalHours : null;
  const expectedFuel = target != null && totalHours > 0 ? totalHours * target : null;
  const difference = expectedFuel != null ? totalDiesel - expectedFuel : null;
  return {
    totalDiesel,
    totalHours,
    opening,
    closing,
    actualAvg,
    target,
    expectedFuel,
    difference,
    withinTarget: difference == null ? null : difference <= 0,
  };
}
