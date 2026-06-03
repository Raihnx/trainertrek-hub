// Trainer incentive formula: max ₹2000/client/month.
// > 14 attendance days => full 2000. Else (2000/31) * days.
export const MAX_INCENTIVE_PER_CLIENT = 2000;

export function incentiveFor(attendanceDays: number): number {
  if (attendanceDays <= 0) return 0;
  if (attendanceDays > 14) return MAX_INCENTIVE_PER_CLIENT;
  return Math.round((MAX_INCENTIVE_PER_CLIENT / 31) * attendanceDays * 100) / 100;
}

export function eligibleDaysFor(totalDays: number, paid: number, total: number): number {
  if (total <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, paid / total));
  return Math.floor(totalDays * ratio);
}

export function monthRange(monthISO: string): { start: string; end: string; label: string } {
  // monthISO like "2026-06"
  const [y, m] = monthISO.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // last day
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start: fmt(start), end: fmt(end), label };
}

export function currentMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function clientStatus(expiry: string): "active" | "expiring" | "expired" {
  const today = new Date();
  const exp = new Date(expiry);
  const diff = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= 14) return "expiring";
  return "active";
}

export function daysLeft(expiry: string): number {
  const today = new Date();
  const exp = new Date(expiry);
  return Math.max(0, Math.ceil((exp.getTime() - today.getTime()) / 86400000));
}
