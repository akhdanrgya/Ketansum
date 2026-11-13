import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { deliveryDates, validDelivery } from "../src/lib/preorder-schedule";
test("jadwal publik hanya Senin/Kamis 10.30–13.00 WIB mulai besok", () => {
  const now = new Date("2026-11-16T18:00:00Z"); // Tuesday in Jakarta
  assert.equal(validDelivery("2026-11-23", "10:30", now), true);
  assert.equal(validDelivery("2026-11-24", "11:00", now), false);
  assert.equal(validDelivery("2026-11-19", "13:30", now), false);
  const dates = deliveryDates(now);
  assert.equal(dates[0], "2026-11-19");
  assert.equal(validDelivery("2026-11-17", "11:00", now), false);
  assert.equal(validDelivery("2026-11-19", "10:00", now), false);
  assert.equal(validDelivery("2026-11-19", "13:00", now), true);
  assert.equal(validDelivery("2026-11-19", "18:00", now), false);
});
test("pengajuan publik privat, idempotent, dan masuk PO hanya setelah persetujuan tim", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    for (const f of [
      "202611090001_initial.sql",
      "202611100002_security.sql",
      "202611130003_preorders.sql",
      "202611130004_public_preorders.sql",
      "202611130005_delivery_schedule.sql",
    ])
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    const cashier = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.exec(
      `insert into auth.users values('${cashier}'); insert into profiles(id,name,role) values('${cashier}','Kasir','cashier');update product_costs set cost=5000;update settings set value=value||'{"qris":"data:image/jpeg;base64,test"}'::jsonb;`,
    );
    async function scalar(sql: string, args: unknown[] = []) {
      return (await db.query<{ result: any }>(sql, args)).rows[0].result;
    }
    const req = {
      customer: "Jordan",
      phone: "081234567890",
      meetingPoint: "Lobi",
      notes: "Test lokal",
      date: deliveryDates()[0],
      time: "10:30",
      items: [
        { productId: "11111111-1111-4111-8111-111111111111", quantity: 1 },
        { productId: "55555555-5555-4555-8555-555555555555", quantity: 2 },
      ],
      expectedTotal: 34000,
    };
    const quote = (token: string, request: object) =>
      scalar("select public.public_preorder_quote($1,$2::jsonb) result", [
        token,
        JSON.stringify(request),
      ]);
    await db.exec("set role anon");
    await assert.rejects(quote("a".repeat(64), req), /permission denied/);
    await assert.rejects(
      db.query("select * from payment_proofs"),
      /permission denied/,
    );
    await db.exec("reset role; set role service_role");
    await assert.rejects(
      quote("b".repeat(64), { ...req, time: "18:00" }),
      /Jadwal/,
    );
    await assert.rejects(
      quote("b".repeat(64), { ...req, date: "2020-01-07" }),
      /Senin/,
    );
    await assert.rejects(
      quote("b".repeat(64), { ...req, expectedTotal: 1 }),
      /Harga/,
    );
    const q = await quote("a".repeat(64), req);
    assert.equal(q.total, 34000);
    assert.equal(q.submitted, false);
    assert.equal(q.customer, undefined);
    assert.equal(q.items[0].cost, undefined);
    assert.equal(q.items.length, 2);
    assert.equal((await quote("a".repeat(64), {})).number, q.number);
    await db.exec("reset role");
    await db.exec("update products set price=99999;");
    // Previously quoted Tuesday requests remain reviewable after the schedule change.
    await db.exec(`update preorder_quotes set payload=jsonb_set(payload,'{preorder,scheduledAt}','"2026-11-17T04:00:00.000Z"'::jsonb);`);
    await db.exec("set role service_role");
    await assert.rejects(
      scalar("select public.public_preorder_submit($1,$2) result", [
        "a".repeat(64),
        null,
      ]),
      /Bukti/,
    );
    const submit = () =>
      scalar("select public.public_preorder_submit($1,$2) result", [
        "a".repeat(64),
        "local-test-image",
      ]);
    assert.equal((await submit()).reviewStatus, "pending");
    assert.equal((await submit()).number, q.number);
    await db.exec("reset role");
    assert.equal(await scalar("select count(*)::int result from orders"), 0);
    assert.equal(
      await scalar("select count(*)::int result from payment_proofs"),
      1,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      cashier,
    ]);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from payment_proofs"),
      /permission denied/,
    );
    let w = await scalar("select read_workspace() result");
    assert.equal(w.orders.length, 0);
    assert.equal(w.preorderRequests.length, 1);
    assert.equal(w.preorderRequests[0].items[0].cost, undefined);
    const id = w.preorderRequests[0].id;
    w = await scalar("select review_public_preorder($1,'approved','') result", [
      id,
    ]);
    assert.equal(w.orders.length, 1);
    assert.equal(w.orders[0].total, 34000);
    assert.equal(w.orders[0].status, "pending");
    assert.equal(w.orders[0].paidAt, undefined);
    assert.equal(w.preorderRequests.length, 0);
    w = await scalar("select review_public_preorder($1,'approved','') result", [
      id,
    ]);
    assert.equal(w.orders.length, 1);
    await assert.rejects(
      scalar("select review_public_preorder($1,'rejected','no') result", [id]),
      /diputuskan/,
    );
    await assert.rejects(
      scalar("select workspace_command($1::jsonb) result", [
        JSON.stringify({
          type: "preorder_update",
          id,
          version: 1,
          customer: "Jordan",
          method: "qris",
          preorder: { ...w.orders[0].preorder, address: "Outside campus" },
        }),
      ]),
      /Kampus C/,
    );
    await db.exec(
      "reset role;update products set price=10000;set role service_role",
    );
    await quote("c".repeat(64), { ...req, expectedTotal: 30000 });
    await scalar("select public_preorder_submit($1,$2) result", [
      "c".repeat(64),
      "test2",
    ]);
    await db.exec("reset role;set role authenticated");
    w = await scalar("select read_workspace() result");
    const rejectedId = w.preorderRequests[0].id;
    await assert.rejects(
      scalar("select review_public_preorder($1,'rejected','') result", [
        rejectedId,
      ]),
      /Alasan/,
    );
    await scalar(
      "select review_public_preorder($1,'rejected','Kapasitas penuh') result",
      [rejectedId],
    );
    await db.exec("reset role");
    assert.equal(await scalar("select count(*)::int result from orders"), 1);
    await db.exec(
      `update profiles set active=false where id='${cashier}';set role authenticated`,
    );
    await assert.rejects(
      scalar("select review_public_preorder($1,'approved','') result", [
        rejectedId,
      ]),
      /Akses tim/,
    );
  } finally {
    await db.close();
  }
});
