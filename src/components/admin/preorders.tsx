"use client";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import type { Workspace, Command, Order, PreorderDetails } from "@/lib/types";
import { day, rupiah } from "@/lib/finance";
const states = {
  pending: "Pending",
  preparing: "Disiapkan",
  delivering: "Diantar",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};
export const scheduleLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)) + " WIB";
function localTime(value: string) {
  return (
    day(value) +
    "T" +
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value))
  );
}
function details(form: FormData) {
  return {
    scheduledAt: new Date(
      String(form.get("schedule")) + ":00+07:00",
    ).toISOString(),
    address: String(form.get("address")).trim(),
    phone: String(form.get("phone") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
  };
}
function DeliveryFields({ order }: { order?: Order }) {
  return (
    <>
      <label>
        Nama pelanggan
        <input
          name="customer"
          placeholder="Jordan"
          defaultValue={order?.customer}
          required
          maxLength={100}
        />
      </label>
      <label>
        Jadwal antar (WIB)
        <input
          name="schedule"
          type="datetime-local"
          required
          defaultValue={
            order?.preorder ? localTime(order.preorder.scheduledAt) : undefined
          }
        />
      </label>
      <label>
        Alamat / lokasi antar
        <textarea
          name="address"
          required
          maxLength={1000}
          defaultValue={order?.preorder?.address}
          placeholder="Gedung, kelas, atau alamat lengkap"
        />
      </label>
      <label>
        Nomor WhatsApp (opsional)
        <input
          name="phone"
          type="tel"
          maxLength={40}
          defaultValue={order?.preorder?.phone}
        />
      </label>
      <label>
        Catatan (opsional)
        <textarea
          name="notes"
          maxLength={1000}
          defaultValue={order?.preorder?.notes}
        />
      </label>
      <label>
        Metode pembayaran
        <select
          name="method"
          defaultValue={order?.method || "cash"}
          disabled={order?.status === "paid"}
        >
          <option value="cash">Tunai</option>
          <option value="qris">QRIS</option>
        </select>
      </label>
    </>
  );
}
export function PreorderOverview({ data }: { data: Workspace }) {
  const orders = data.orders
    .filter(
      (o) =>
        o.preorder &&
        !["cancelled", "voided"].includes(o.status) &&
        o.preorder.status !== "completed",
    )
    .sort((a, b) =>
      a.preorder!.scheduledAt.localeCompare(b.preorder!.scheduledAt),
    );
  return (
    <section className="panel preorder-overview">
      <div className="panel-heading">
        <div>
          <h2>Jadwal preorder</h2>
          <p>
            {orders.length} pesanan aktif ·{" "}
            {
              orders.filter((o) => day(o.preorder!.scheduledAt) === day())
                .length
            }{" "}
            dijadwalkan hari ini
          </p>
        </div>
        <Link className="text-link" href="/admin/preorder">
          Kelola preorder ↗
        </Link>
      </div>
      {orders.length ? (
        orders.slice(0, 5).map((o) => (
          <article key={o.id} className="preorder-summary">
            <strong>{o.customer}</strong>
            <span>{scheduleLabel(o.preorder!.scheduledAt)}</span>
            <span>
              {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
            </span>
            <span>
              {states[o.preorder!.status]} ·{" "}
              {o.status === "paid" ? "Lunas" : "Belum lunas"}
            </span>
          </article>
        ))
      ) : (
        <p>
          Belum ada preorder aktif. Tambahkan pesanan dan jadwal antar melalui
          menu Preorder.
        </p>
      )}
    </section>
  );
}
export function Preorders({
  data,
  run,
  busy,
  renderPayment,
}: {
  data: Workspace;
  run: (command: Command) => Promise<boolean>;
  busy: boolean;
  renderPayment: (order: Order, close: () => void) => ReactNode;
}) {
  const [creating, setCreating] = useState(false),
    [quantities, setQuantities] = useState<Record<string, number>>({}),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [date, setDate] = useState(""),
    [status, setStatus] = useState(""),
    [payment, setPayment] = useState("");
  const requestId = useRef("");
  const orders = data.orders
    .filter(
      (o) =>
        o.preorder &&
        (!search ||
          `${o.customer} ${o.number} ${o.preorder.phone}`
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (!date || day(o.preorder.scheduledAt) === date) &&
        (!status || o.preorder.status === status) &&
        (!payment || o.status === payment),
    )
    .sort((a, b) =>
      a.preorder!.scheduledAt.localeCompare(b.preorder!.scheduledAt),
    );
  const total = data.products.reduce(
    (sum, p) => sum + p.price * (quantities[p.id] || 0),
    0,
  );
  return (
    <>
      <div className="report-toolbar">
        <button
          className="button yellow-bg"
          onClick={() => setCreating(!creating)}
        >
          {creating ? "Tutup form" : "+ Preorder baru"}
        </button>
        <button className="text-link" onClick={() => window.location.reload()}>
          Muat ulang data
        </button>
      </div>
      {error && (
        <p className="error banner" role="alert">
          {error}
        </p>
      )}
      {creating && (
        <form
          className="panel preorder-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const form = e.currentTarget;
            const values = new FormData(form);
            const items = Object.entries(quantities)
              .filter(([, q]) => q > 0)
              .map(([productId, quantity]) => ({ productId, quantity }));
            if (!items.length) {
              setError("Pilih setidaknya satu menu.");
              return;
            }
            try {
              requestId.current ||= crypto.randomUUID();
              if (
                await run({
                  type: "create",
                  id: requestId.current,
                  customer: String(values.get("customer")).trim(),
                  method: values.get("method") as "cash" | "qris",
                  items,
                  preorder: details(values),
                })
              ) {
                requestId.current = "";
                setQuantities({});
                form.reset();
                setCreating(false);
              } else
                setError(
                  "Preorder belum terkonfirmasi tersimpan. Periksa pesan di atas atau muat ulang data sebelum membuat ulang.",
                );
            } catch {
              setError("Periksa jadwal dan isian preorder.");
            }
          }}
        >
          <h2>Pesanan terjadwal</h2>
          <p>Status awal pending dan belum lunas. Jadwal selalu memakai WIB.</p>
          <div className="preorder-fields">
            <DeliveryFields />
          </div>
          <fieldset>
            <legend>Menu & jumlah porsi</legend>
            <div className="preorder-products">
              {data.products
                .filter((p) => p.active && p.available)
                .map((p) => (
                  <label key={p.id}>
                    {p.name} · {rupiah(p.price)}
                    <input
                      type="number"
                      min={0}
                      max={999}
                      step={1}
                      disabled={p.cost === null}
                      value={quantities[p.id] || 0}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [p.id]: Number(e.target.value),
                        })
                      }
                    />
                    {p.cost === null && <small>HPP belum diisi</small>}
                  </label>
                ))}
            </div>
          </fieldset>
          <strong>Total: {rupiah(total)}</strong>
          <button disabled={busy} className="button yellow-bg">
            {busy ? "Menyimpan…" : "Simpan preorder"}
          </button>
        </form>
      )}
      <div className="preorder-filters">
        <label>
          Cari pelanggan
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nama, nomor pesanan, telepon"
          />
        </label>
        <label>
          Tanggal antar (WIB)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Status pesanan
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua</option>
            {Object.entries(states).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pembayaran
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">Semua</option>
            <option value="pending">Belum lunas</option>
            <option value="paid">Lunas</option>
            <option value="voided">Dikembalikan</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </label>
      </div>
      <div className="preorder-list">
        {orders.length === 0 && (
          <p className="panel">Belum ada preorder yang cocok.</p>
        )}
        {orders.map((o) => {
          const po = o.preorder!;
          const closed = ["cancelled", "voided"].includes(o.status);
          return (
            <article className="panel preorder-card" key={o.id}>
              <div className="panel-heading">
                <h2>{o.customer}</h2>
                <span className={`status ${o.status}`}>
                  {o.status === "paid"
                    ? "Lunas"
                    : o.status === "pending"
                      ? "Belum lunas"
                      : o.status === "voided"
                        ? "Dana dikembalikan"
                        : "Dibatalkan"}
                </span>
              </div>
              <strong>{scheduleLabel(po.scheduledAt)}</strong>
              <p>
                {states[po.status]}
                {!closed &&
                po.status !== "completed" &&
                new Date(po.scheduledAt).getTime() < Date.now()
                  ? " · Jadwal sudah lewat"
                  : ""}
              </p>
              <ul>
                {o.items.map((i, n) => (
                  <li key={n}>
                    {i.quantity} × {i.name} — {rupiah(i.price * i.quantity)}
                  </li>
                ))}
              </ul>
              <p>
                <strong>{rupiah(o.total)}</strong> ·{" "}
                {o.method === "cash" ? "Tunai" : "QRIS"}
              </p>
              <p>{po.address}</p>
              {po.phone && <p>Kontak: {po.phone}</p>}
              {po.notes && <p>Catatan: {po.notes}</p>}
              <small className="preorder-number">{o.number}</small>
              <div className="preorder-actions">
                <button
                  className="button yellow-bg"
                  onClick={() => setSelected(o.id)}
                >
                  Pembayaran & detail
                </button>
                {!closed && (
                  <button
                    className="button"
                    onClick={() => setEditing(editing === o.id ? null : o.id)}
                  >
                    Ubah jadwal / status
                  </button>
                )}
              </div>
              {editing === o.id && !closed && (
                <form
                  key={`${o.id}-${po.version}`}
                  className="preorder-edit"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError("");
                    const f = new FormData(e.currentTarget);
                    try {
                      if (
                        await run({
                          type: "preorder_update",
                          id: o.id,
                          version: po.version,
                          customer: String(f.get("customer")).trim(),
                          method:
                            o.status === "paid"
                              ? o.method
                              : (f.get("method") as "cash" | "qris"),
                          preorder: {
                            ...details(f),
                            version: po.version,
                            status: f.get(
                              "status",
                            ) as PreorderDetails["status"],
                          },
                        })
                      )
                        setEditing(null);
                      else
                        setError(
                          "Perubahan gagal. Jika pesanan diubah tim lain, muat ulang data.",
                        );
                    } catch {
                      setError("Jadwal tidak valid.");
                    }
                  }}
                >
                  <div className="preorder-fields">
                    <DeliveryFields order={o} />
                    <label>
                      Status pesanan
                      <select name="status" defaultValue={po.status}>
                        {Object.entries(states)
                          .filter(([v]) => v !== "cancelled")
                          .map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <p className="helper">
                    Selesai membutuhkan pembayaran lunas. Batalkan melalui
                    detail pembayaran; pengembalian dana hanya admin. Menu
                    pesanan tersimpan sebagai snapshot; untuk mengganti item,
                    batalkan dan buat ulang.
                  </p>
                  <button className="button yellow-bg" disabled={busy}>
                    Simpan perubahan
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>
      {selected &&
        data.orders.find((o) => o.id === selected) &&
        renderPayment(
          data.orders.find((o) => o.id === selected)!,
          () => setSelected(null),
        )}
    </>
  );
}
