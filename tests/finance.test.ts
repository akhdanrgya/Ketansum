import test from "node:test";
import assert from "node:assert/strict";
import { initialWorkspace } from "../src/lib/data";
import { applyCommand } from "../src/lib/demo";
import { report, day } from "../src/lib/finance";
function fixture() {
  const d = initialWorkspace();
  d.products[0].cost = 6000;
  return d;
}
const create = {
  type: "create" as const,
  id: "test-order",
  items: [{ productId: initialWorkspace().products[0].id, quantity: 2 }],
  method: "cash" as const,
  customer: "",
};
test("HPP wajib diisi dan uang kurang ditolak", () => {
  assert.throws(() => applyCommand(initialWorkspace(), create), /HPP/);
  const d = applyCommand(fixture(), create);
  assert.throws(
    () => applyCommand(d, { type: "pay", id: create.id, received: 19000 }),
    /kurang/,
  );
});
test("snapshot, retry, dan laba mengikuti transaksi asli", () => {
  let d = applyCommand(fixture(), create, "2026-11-09T10:00:00Z");
  d = applyCommand(d, create);
  assert.equal(d.orders.length, 1);
  d = applyCommand(
    d,
    { type: "pay", id: create.id, received: 50000 },
    "2026-11-09T10:01:00Z",
  );
  d = applyCommand(d, { type: "pay", id: create.id, received: 50000 });
  d.products[0].cost = 9000;
  d.products[0].price = 30000;
  d = applyCommand(d, {
    type: "expense",
    expense: {
      id: "expense",
      date: "2026-11-09",
      category: "Transportasi",
      description: "Ongkos",
      amount: 3000,
    },
  });
  const r = report(d, "2026-11-09", "2026-11-09");
  assert.equal(r.revenue, 20000);
  assert.equal(r.cost, 12000);
  assert.equal(r.profit, 5000);
  assert.equal(d.orders[0].received - d.orders[0].total, 30000);
});
test("pembatalan membalik di tanggal pembatalan saja", () => {
  let d = applyCommand(fixture(), create);
  d = applyCommand(
    d,
    { type: "pay", id: create.id, received: 20000 },
    "2026-11-09T10:00:00Z",
  );
  d = applyCommand(
    d,
    { type: "cancel", id: create.id, reason: "Koreksi" },
    "2026-11-10T01:00:00Z",
  );
  assert.equal(report(d, "2026-11-09", "2026-11-09").revenue, 20000);
  assert.equal(report(d, "2026-11-10", "2026-11-10").revenue, -20000);
  assert.equal(report(d, "2026-11-09", "2026-11-10").cost, 0);
  assert.deepEqual(
    applyCommand(d, { type: "cancel", id: create.id, reason: "Retry" }),
    d,
  );
});
test("kasir tidak dapat membatalkan transaksi lunas", () => {
  let d = applyCommand(fixture(), create);
  d = applyCommand(d, { type: "pay", id: create.id, received: 20000 });
  d.role = "cashier";
  assert.throws(
    () => applyCommand(d, { type: "cancel", id: create.id, reason: "Koreksi" }),
    /admin/,
  );
});
test("QRIS tidak tersedia sebelum gambar diisi dan waktu memakai Jakarta", () => {
  assert.throws(
    () => applyCommand(fixture(), { ...create, method: "qris" }),
    /QRIS/,
  );
  assert.equal(day("2026-11-09T17:30:00Z"), "2026-11-10");
});
