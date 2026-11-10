import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Workspace } from "../src/lib/types";

test("migration, RPC snapshots, idempotency, and database permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(
      await readFile("supabase/migrations/202611090001_initial.sql", "utf8"),
    );
    const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      cashier = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.exec(
      `insert into auth.users values ('${admin}'),('${cashier}');insert into public.profiles(id,name,role) values('${admin}','Test Admin','admin'),('${cashier}','Test Cashier','cashier');`,
    );
    async function identity(id: string) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    }
    async function command(c: object) {
      return (
        await db.query<{ result: Workspace }>(
          "select public.workspace_command($1::jsonb) result",
          [JSON.stringify(c)],
        )
      ).rows[0].result;
    }
    async function workspace() {
      return (
        await db.query<{ result: Workspace }>(
          "select public.read_workspace() result",
        )
      ).rows[0].result;
    }
    await identity(admin);
    let d = await workspace();
    assert.equal(d.products.length, 6);
    assert.equal(d.products[0].cost, null);
    const p = { ...d.products[0], cost: 6000 };
    await command({ type: "product", product: p });
    await command({
      type: "settings",
      settings: { ...d.settings, merchant: "Test Ketansum" },
    });
    const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const create = {
      type: "create",
      id,
      items: [{ productId: p.id, quantity: 2 }],
      method: "cash",
      customer: "Test",
    };
    d = await command(create);
    assert.equal(d.orders[0].total, 20000);
    d = await command(create);
    assert.equal(d.orders.length, 1);
    await assert.rejects(
      command({ type: "pay", id, received: 19000 }),
      /kurang/,
    );
    d = await command({ type: "pay", id, received: 50000 });
    assert.equal(d.orders[0].status, "paid");
    await command({
      type: "product",
      product: { ...p, price: 30000, cost: 9000 },
    });
    d = await command({ type: "pay", id, received: 50000 });
    assert.equal(d.orders[0].total, 20000);
    assert.equal(d.orders[0].items[0].cost, 6000);
    await command({
      type: "expense",
      expense: {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        date: "2026-11-09",
        category: "Transportasi",
        description: "Test",
        amount: 3000,
      },
    });
    await db.exec("reset role");
    await identity(cashier);
    d = await workspace();
    assert.equal(d.orders.length, 0);
    assert.equal(d.products.find((x) => x.id === p.id)?.cost, 0);
    assert.deepEqual(d.expenses, []);
    await assert.rejects(
      db.query("select * from public.product_costs"),
      /permission denied/,
    );
    await assert.rejects(command({ type: "product", product: p }), /admin/);
    await assert.rejects(
      command({ type: "cancel", id, reason: "Test" }),
      /tidak ditemukan/,
    );
    const cashierId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    d = await command({ ...create, id: cashierId });
    assert.equal(d.orders.length, 1);
    assert.equal(d.orders[0].items[0].cost, 0);
    await command({ type: "pay", id: cashierId, received: 60000 });
    await assert.rejects(
      command({ type: "cancel", id: cashierId, reason: "Test" }),
      /admin/,
    );
    await db.exec("reset role");
    await identity(admin);
    d = await command({ type: "cancel", id, reason: "Test reversal" });
    assert.equal(d.orders.find((o) => o.id === id)?.status, "voided");
    await command({ type: "cancel", id, reason: "Retry" });
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int count from public.reversals",
        )
      ).rows[0].count,
      1,
    );
    await db.exec("set role anon");
    assert.equal(
      (await db.query("select * from public.products")).rows.length,
      6,
    );
    await assert.rejects(
      db.query("select * from public.orders"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.read_workspace()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
