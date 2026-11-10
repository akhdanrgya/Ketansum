import type { Workspace, Order } from "./types";
export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const day = (value = new Date().toISOString()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export function report(
  data: Pick<Workspace, "orders" | "expenses">,
  from: string,
  to: string,
) {
  const within = (value?: string) =>
    !!value && day(value) >= from && day(value) <= to;
  const sales = data.orders.filter((o) => within(o.paidAt));
  const reversals = data.orders.filter((o) => within(o.voidedAt));
  const total = (orders: Order[], fn: (o: Order) => number) =>
    orders.reduce((s, o) => s + fn(o), 0);
  const costOf = (o: Order) =>
    o.items.reduce((s, i) => s + i.cost * i.quantity, 0);
  const gross = total(sales, (o) => o.total),
    refunded = total(reversals, (o) => o.total);
  const revenue = gross - refunded,
    cost = total(sales, costOf) - total(reversals, costOf);
  const expenses = data.expenses
    .filter((e) => e.date >= from && e.date <= to)
    .reduce((s, e) => s + e.amount, 0);
  return {
    gross,
    refunded,
    revenue,
    cost,
    expenses,
    profit: revenue - cost - expenses,
    count: sales.length,
    voidCount: reversals.length,
    units: total(sales, (o) => o.items.reduce((s, i) => s + i.quantity, 0)),
    sales,
    reversals,
  };
}
