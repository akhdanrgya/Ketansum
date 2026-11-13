export const CAMPUS = "Kampus C Telkom University";
export function jakartaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function deliveryDates(now = new Date()) {
  const start = new Date(jakartaDate(now) + "T00:00:00+07:00");
  return Array.from(
    { length: 60 },
    (_, i) => new Date(start.getTime() + (i + 1) * 86400000),
  )
    .filter((d) =>
      [2, 4].includes(new Date(jakartaDate(d) + "T00:00:00Z").getUTCDay()),
    )
    .map((d) => jakartaDate(d));
}
export const deliveryTimes = [
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];
export function validDelivery(date: string, time: string, now = new Date()) {
  return deliveryDates(now).includes(date) && deliveryTimes.includes(time);
}
export const deliveryDateLabel = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date + "T12:00:00+07:00"));
