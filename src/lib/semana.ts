/** Returns Monday 00:00 and Sunday 23:59 UTC for the week containing `date`. */
export function getWeekBounds(date = new Date()) {
  const day = date.getUTCDay(); // 0=Sun … 6=Sat
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { periodoInicio: monday, periodoFin: sunday };
}
