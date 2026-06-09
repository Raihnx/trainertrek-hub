// 1-hour training slots, 6 AM to 10 PM (last slot starts at 21:00, ends 22:00).
export const TRAINING_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6..21

export function formatHour(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12} ${period}`;
}

export function formatHourRange(h: number): string {
  return `${formatHour(h)} – ${formatHour(h + 1)}`;
}
