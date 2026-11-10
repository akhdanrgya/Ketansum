"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Package,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  NotebookPen,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Minus,
  Search,
  Download,
  LogOut,
  Menu,
  X,
  Check,
  Printer,
} from "lucide-react";
import { initialWorkspace, isDemo } from "@/lib/data";
import { applyCommand } from "@/lib/demo";
import { day, report, rupiah } from "@/lib/finance";
import type { Workspace, Command, Product, Order } from "@/lib/types";
import { ProductArt } from "./product-art";
const links = [
  ["dashboard", "Ringkasan", LayoutDashboard],
  ["kasir", "Kasir", ShoppingBag],
  ["produk", "Menu & produk", Package],
  ["transaksi", "Transaksi", Receipt],
  ["pengeluaran", "Pengeluaran", Wallet],
  ["laporan", "Laporan", ChartNoAxesCombined],
  ["konten", "Cerita & konten", NotebookPen],
  ["pengaturan", "Pengaturan", Settings],
] as const;
const storageKey = "ketansum-demo-v1";
const titles: Record<string, string> = {
  dashboard: "Usaha kecil, cerita besar.",
  kasir: "Ada pesanan apa hari ini?",
  produk: "Menu yang bikin kangen.",
  transaksi: "Setiap pesanan, tercatat.",
  pengeluaran: "Catat biaya usahamu.",
  laporan: "Angka di balik rasa.",
  konten: "Ceritain Ketansum.",
  pengaturan: "Bikin jadi milikmu.",
};
export function Admin({ page }: { page: string }) {
  const [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let live = true;
    if (isDemo) {
      try {
        const raw = localStorage.getItem(storageKey);
        setData(raw ? JSON.parse(raw) : initialWorkspace());
      } catch {
        setError(
          "Data demo tidak dapat dibaca. Periksa izin penyimpanan browser.",
        );
      }
    } else {
      fetch("/api/workspace")
        .then(async (r) => {
          const result = await r.json();
          if (!r.ok) throw Error(result.error);
          if (live) setData(result);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    }
    return () => {
      live = false;
    };
  }, []);
  async function run(command: Command) {
    if (lock.current || !data) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let result: Workspace;
      if (isDemo) {
        const raw = localStorage.getItem(storageKey);
        result = applyCommand(raw ? JSON.parse(raw) : data, command);
        localStorage.setItem(storageKey, JSON.stringify(result));
      } else {
        const response = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        result = body;
      }
      setData(result);
      setMessage("Berhasil disimpan.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi.");
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timeout);
    }
  }, [message]);
  const admin = data?.role === "admin";
  const permitted = admin || ["kasir", "transaksi"].includes(page);
  return (
    <MotionConfig reducedMotion="user">
      <div className="admin-shell">
        <aside className={`sidebar ${mobile ? "open" : ""}`}>
          <div className="side-brand">
            <Link href="/" className="wordmark">
              ketansum<span>★</span>
            </Link>
            <button
              className="icon-button mobile-only"
              onClick={() => setMobile(false)}
              aria-label="Tutup navigasi"
            >
              <X />
            </button>
          </div>
          <span className="side-caption">
            RUANG TIM / {isDemo ? "DEMO LOKAL" : admin ? "ADMIN" : "KASIR"}
          </span>
          <nav>
            {links
              .filter(
                ([key]) =>
                  admin || !data || ["kasir", "transaksi"].includes(key),
              )
              .map(([key, label, Icon]) => (
                <Link
                  onClick={() => setMobile(false)}
                  key={key}
                  href={key === "dashboard" ? "/admin" : `/admin/${key}`}
                  className={page === key ? "selected" : ""}
                >
                  <Icon size={19} />
                  {label}
                  {key === page && <span>↗</span>}
                </Link>
              ))}
          </nav>
          <div className="side-bottom">
            <div className="side-note">
              GOOD FOOD.
              <br />
              GOOD BUSINESS.<span>✦</span>
            </div>
            <Link href="/" className="side-back">
              <ArrowLeft size={16} /> Lihat website
            </Link>
            <button
              className="side-back"
              onClick={async () => {
                if (!isDemo) {
                  await fetch("/api/auth/signout", { method: "POST" });
                }
                window.location.assign("/login");
              }}
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </aside>
        {mobile && (
          <button
            aria-label="Tutup navigasi"
            className="sidebar-overlay"
            onClick={() => setMobile(false)}
          />
        )}
        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <button
                className="icon-button mobile-only"
                onClick={() => setMobile(true)}
                aria-label="Buka navigasi"
              >
                <Menu />
              </button>
              <span>
                Workspace{" "}
                <span className="muted">
                  / {links.find(([key]) => key === page)?.[1]}
                </span>
              </span>
            </div>
            <span className="user-chip">
              <span className="avatar">K</span>
              {isDemo ? "Admin Demo" : admin ? "Admin" : "Kasir"}
              <span className="online-dot" />
            </span>
          </header>
          {isDemo && (
            <div className="demo-banner">
              <span>✦</span> MODE DEMO — Data tersimpan di browser ini, bukan
              transaksi asli.
            </div>
          )}
          <main className="admin-content">
            <div className="admin-heading">
              <div>
                <span className="eyebrow">KETANSUM BUSINESS CLUB</span>
                <h1>{titles[page]}</h1>
                <p>
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "full",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date())}
                </p>
              </div>
              {page !== "kasir" && (
                <Link className="button yellow-bg small" href="/admin/kasir">
                  <Plus size={18} /> Transaksi baru
                </Link>
              )}
            </div>
            {error && (
              <div role="alert" className="error banner">
                {error}
                <button onClick={() => setError("")} aria-label="Tutup pesan">
                  ×
                </button>
              </div>
            )}
            {message && (
              <div role="status" className="toast">
                <Check size={16} />
                {message}
              </div>
            )}
            {!data ? (
              <div className="panel loading">
                {error
                  ? "Data belum tersedia. Muat ulang setelah konfigurasi diperbaiki."
                  : "Menyiapkan ruang tim…"}
              </div>
            ) : !permitted ? (
              <div className="panel">
                <h2>Halaman khusus admin</h2>
                <Link href="/admin/kasir" className="button yellow-bg">
                  Buka kasir
                </Link>
              </div>
            ) : (
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {(page === "dashboard" || page === "laporan") && (
                  <Reports data={data} detailed={page === "laporan"} />
                )}{" "}
                {page === "kasir" && <POS data={data} run={run} busy={busy} />}{" "}
                {page === "produk" && (
                  <Products data={data} run={run} busy={busy} />
                )}{" "}
                {page === "transaksi" && (
                  <Transactions data={data} run={run} busy={busy} />
                )}{" "}
                {page === "pengeluaran" && (
                  <Expenses data={data} run={run} busy={busy} />
                )}{" "}
                {(page === "pengaturan" || page === "konten") && (
                  <Preferences
                    data={data}
                    run={run}
                    busy={busy}
                    content={page === "konten"}
                  />
                )}
              </motion.div>
            )}
          </main>
          <div className="admin-footer">
            Ketansum · Dari ide jadi usaha.<span>Made with good taste ✦</span>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
const periodStart = () => {
  const now = day();
  return now.slice(0, 8) + "01";
};
type Actions = {
  data: Workspace;
  run: (c: Command) => Promise<boolean>;
  busy: boolean;
};
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span>✳</span>
      <h3>Belum ada cerita di sini.</h3>
      <p>{text}</p>
    </div>
  );
}
function Reports({ data, detailed }: { data: Workspace; detailed: boolean }) {
  const [from, setFrom] = useState(periodStart),
    [to, setTo] = useState(day());
  const stats = report(data, from, to);
  const bars = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${to}T12:00:00+07:00`);
    date.setUTCDate(date.getUTCDate() - 6 + i);
    const key = day(date.toISOString());
    return { key, value: key < from ? 0 : report(data, key, key).revenue };
  });
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  function exportCSV() {
    const rows = [
      ["Ketansum", isDemo ? "DEMO" : "Laporan"],
      ["Periode", from, to],
      ["Penjualan bruto", stats.gross],
      ["Pembatalan", stats.refunded],
      ["Omzet bersih", stats.revenue],
      ["HPP bersih", stats.cost],
      ["Laba kotor", stats.revenue - stats.cost],
      ["Biaya operasional", stats.expenses],
      ["Laba bersih operasional", stats.profit],
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ketansum-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="report-toolbar">
        <div className="date-range">
          <label>
            Dari
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <span>→</span>
          <label>
            Sampai
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <button className="button white small" onClick={exportCSV}>
          <Download size={16} /> Ekspor CSV
        </button>
      </div>
      <div className="stat-grid">
        {[
          [
            "Omzet bersih",
            rupiah(stats.revenue),
            "Seluruh pembayaran terkonfirmasi",
          ],
          [
            "Transaksi lunas",
            String(stats.count),
            `${stats.voidCount} pembatalan pada periode ini`,
          ],
          ["Porsi terjual", String(stats.units), "Sebelum pembatalan"],
          [
            "Laba bersih operasional",
            rupiah(stats.profit),
            "Setelah HPP & biaya operasional",
          ],
        ].map(([title, value, note], i) => (
          <div
            className={`stat-card ${i === 0 ? "blue-stat" : ""}`}
            key={title}
          >
            <span>
              {title}
              <ArrowUpRight size={16} />
            </span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Naik turun, tetap jalan.</h2>
              <p>Omzet bersih · 7 hari terakhir dalam periode</p>
            </div>
            <span className="tiny-badge">IDR</span>
          </div>
          <div className="chart">
            {bars.map((b) => (
              <div className="chart-column" key={b.key}>
                <small>
                  {b.value ? `${Math.round(b.value / 1000)}k` : "0"}
                </small>
                <div
                  className={`chart-bar ${b.value < 0 ? "negative" : ""}`}
                  style={{
                    height: `${Math.max(3, (Math.abs(b.value) / max) * 135)}px`,
                  }}
                />
                <span>{b.key.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel profit-panel">
          <span className="eyebrow">BIAR MAKIN PAHAM</span>
          <h2>Ke mana uangnya?</h2>
          {[
            ["Penjualan bruto", stats.gross],
            ["Pembatalan", -stats.refunded],
            ["HPP bersih", stats.cost],
            ["Biaya operasional", stats.expenses],
          ].map(([label, value]) => (
            <div className="summary-row" key={label}>
              <span>{label}</span>
              <strong>{rupiah(Number(value))}</strong>
            </div>
          ))}
          <div className="summary-row total">
            <span>Laba bersih</span>
            <strong>{rupiah(stats.profit)}</strong>
          </div>
          <small>HPP standar per porsi. Bukan laporan arus kas.</small>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              {detailed
                ? "Penjualan dalam periode"
                : "Pesanan yang baru mampir"}
            </h2>
            <p>
              {detailed
                ? "Berdasarkan waktu pembayaran, zona Asia/Jakarta."
                : "Transaksi terbaru pada periode terpilih."}
            </p>
          </div>
          <Link href="/admin/transaksi" className="text-link">
            Lihat semua <ArrowUpRight size={16} />
          </Link>
        </div>
        {stats.sales.length ? (
          <OrderTable orders={stats.sales.slice(0, detailed ? undefined : 5)} />
        ) : (
          <Empty text="Mulai catat transaksi di kasir. Angkanya akan muncul di sini." />
        )}
      </section>
    </>
  );
}
function OrderTable({
  orders,
  onSelect,
}: {
  orders: Order[];
  onSelect?: (o: Order) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Transaksi</th>
            <th>Pelanggan</th>
            <th>Pembayaran</th>
            <th>Total</th>
            <th>Status</th>
            {onSelect && <th />}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.number}</strong>
                <small>
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(o.createdAt))}
                </small>
              </td>
              <td>{o.customer || "Pelanggan langsung"}</td>
              <td>{o.method === "cash" ? "Tunai" : "QRIS"}</td>
              <td>{rupiah(o.total)}</td>
              <td>
                <span className={`status ${o.status}`}>
                  {
                    {
                      paid: "Lunas",
                      pending: "Menunggu",
                      cancelled: "Dibatalkan",
                      voided: "Dikembalikan",
                    }[o.status]
                  }
                </span>
              </td>
              {onSelect && (
                <td>
                  <button className="text-link" onClick={() => onSelect(o)}>
                    Detail ↗
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function POS({ data, run, busy }: Actions) {
  const [cart, setCart] = useState<Record<string, number>>({}),
    [search, setSearch] = useState(""),
    [method, setMethod] = useState<"cash" | "qris">("cash"),
    [customer, setCustomer] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [ready, setReady] = useState(false);
  const key = useRef("");
  useEffect(() => {
    try {
      setCart(JSON.parse(sessionStorage.getItem("ketansum-cart") || "{}"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) sessionStorage.setItem("ketansum-cart", JSON.stringify(cart));
  }, [cart, ready]);
  const items = Object.entries(cart)
    .map(([id, quantity]) => ({
      product: data.products.find((p) => p.id === id),
      quantity,
    }))
    .filter((x) => x.product && x.quantity > 0);
  const total = items.reduce((s, i) => s + i.product!.price * i.quantity, 0);
  const change = (id: string, delta: number) => {
    key.current = "";
    setCart((c) => ({
      ...c,
      [id]: Math.max(0, Math.min(999, (c[id] || 0) + delta)),
    }));
  };
  async function create() {
    if (!key.current) key.current = crypto.randomUUID();
    const id = key.current;
    if (
      await run({
        type: "create",
        id,
        items: items.map((i) => ({
          productId: i.product!.id,
          quantity: i.quantity,
        })),
        method,
        customer,
      })
    ) {
      setSelected(id);
      setCart({});
      key.current = "";
    }
  }
  return (
    <>
      <div className="pos-layout">
        <section>
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Cari ketan, dimsum…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari menu"
            />
          </div>
          <div className="pos-products">
            {data.products
              .filter(
                (p) =>
                  p.active &&
                  p.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((p) => (
                <button
                  className="pos-product"
                  disabled={!p.available || p.cost === null}
                  onClick={() => change(p.id, 1)}
                  key={p.id}
                >
                  <ProductArt art={p.art} name={p.name} image={p.image} />
                  <div>
                    <strong>{p.name}</strong>
                    <span>{rupiah(p.price)}</span>
                    <small>
                      {p.cost === null
                        ? "Isi HPP dulu"
                        : !p.available
                          ? "Lagi habis"
                          : "+ Tambah ke pesanan"}
                    </small>
                  </div>
                </button>
              ))}
          </div>
          <p className="helper">
            Produk tanpa HPP belum bisa dijual. Isi HPP lewat Menu & produk.
          </p>
        </section>
        <section className="panel cart">
          <div className="panel-heading">
            <h2>Pesanan baru</h2>
            <ShoppingBag size={20} />
          </div>
          {!items.length ? (
            <Empty text="Pilih menu di sebelah untuk mulai." />
          ) : (
            <div className="cart-items">
              {items.map(({ product: p, quantity }) => (
                <div className="cart-item" key={p!.id}>
                  <div>
                    <strong>{p!.name}</strong>
                    <small>{rupiah(p!.price)}</small>
                  </div>
                  <div className="quantity">
                    <button
                      onClick={() => change(p!.id, -1)}
                      aria-label={`Kurangi ${p!.name}`}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{quantity}</span>
                    <button
                      onClick={() => change(p!.id, 1)}
                      aria-label={`Tambah ${p!.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <label>
            Nama pelanggan (opsional)
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Pelanggan langsung"
              maxLength={100}
            />
          </label>
          <label>Metode pembayaran</label>
          <div className="payment-method">
            <button
              className={method === "cash" ? "active" : ""}
              onClick={() => {
                setMethod("cash");
                key.current = "";
              }}
            >
              Tunai
            </button>
            <button
              disabled={!data.settings.qris}
              className={method === "qris" ? "active" : ""}
              onClick={() => {
                setMethod("qris");
                key.current = "";
              }}
            >
              QRIS
            </button>
          </div>
          {!data.settings.qris && (
            <small className="helper">QRIS belum diunggah oleh admin.</small>
          )}
          <div className="summary-row total">
            <span>Total</span>
            <strong>{rupiah(total)}</strong>
          </div>
          <button
            className="button yellow-bg full"
            disabled={!items.length || busy}
            onClick={create}
          >
            {busy ? "Menyimpan…" : "Lanjut pembayaran"}{" "}
            <ArrowUpRight size={18} />
          </button>
        </section>
      </div>
      {selected && (
        <OrderDialog
          order={data.orders.find((o) => o.id === selected)!}
          data={data}
          run={run}
          busy={busy}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={ref} className="dialog" onCancel={close}>
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Tutup dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function OrderDialog({
  order: o,
  data,
  run,
  busy,
  close,
}: Actions & { order: Order; close: () => void }) {
  const [received, setReceived] = useState(""),
    [verified, setVerified] = useState(false),
    [cancel, setCancel] = useState(false),
    [reason, setReason] = useState("");
  if (!o) return null;
  return (
    <Dialog
      title={o.status === "paid" ? "Pesanan beres!" : o.number}
      close={close}
    >
      <div className="receipt">
        <span className="eyebrow">{isDemo ? "DEMO · " : ""}KETANSUM</span>
        <h3>{o.number}</h3>
        <small>
          {new Date(o.createdAt).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
          })}{" "}
          · {o.customer || "Pelanggan langsung"}
        </small>
        {o.items.map((i, index) => (
          <div className="summary-row" key={index}>
            <span>
              {i.quantity} × {i.name}
            </span>
            <strong>{rupiah(i.quantity * i.price)}</strong>
          </div>
        ))}
        <div className="summary-row total">
          <span>Total</span>
          <strong>{rupiah(o.total)}</strong>
        </div>
        <p>
          {o.method === "cash" ? "Tunai" : "QRIS"} ·{" "}
          {
            {
              paid: "Lunas",
              pending: "Menunggu pembayaran",
              voided: "Dikembalikan",
              cancelled: "Dibatalkan",
            }[o.status]
          }
        </p>
        {o.status === "paid" && o.method === "cash" && (
          <>
            <div className="summary-row">
              <span>Diterima</span>
              <strong>{rupiah(o.received)}</strong>
            </div>
            <div className="summary-row">
              <span>Kembalian</span>
              <strong>{rupiah(o.received - o.total)}</strong>
            </div>
          </>
        )}
      </div>
      {o.status === "pending" && (
        <div className="no-print">
          {o.method === "cash" ? (
            <>
              <label>
                Uang diterima
                <input
                  autoFocus
                  type="number"
                  min={o.total}
                  step="1"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder={String(o.total)}
                />
              </label>
              <div className="summary-row">
                <span>Kembalian</span>
                <strong>
                  {rupiah(Math.max(0, Number(received) - o.total))}
                </strong>
              </div>
            </>
          ) : (
            <>
              <img
                className="qris"
                src={data.settings.qris}
                alt={`QRIS ${data.settings.merchant}`}
              />
              <p className="center">
                {data.settings.merchant} · Bayar {rupiah(o.total)}
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                Saya sudah memeriksa pembayaran masuk di aplikasi merchant.
              </label>
            </>
          )}
          <button
            className="button yellow-bg full"
            disabled={
              busy ||
              (o.method === "cash"
                ? Number(received) < o.total || received === ""
                : !verified)
            }
            onClick={() =>
              run({
                type: "pay",
                id: o.id,
                received: o.method === "cash" ? Number(received) : o.total,
              })
            }
          >
            Konfirmasi pembayaran <Check size={18} />
          </button>
        </div>
      )}
      {o.status === "paid" && (
        <button
          className="button yellow-bg full no-print"
          onClick={() => window.print()}
        >
          <Printer size={18} /> Cetak struk
        </button>
      )}
      {(o.status === "pending" ||
        (o.status === "paid" && data.role === "admin")) && (
        <div className="no-print">
          {cancel ? (
            <>
              <label>
                Alasan pembatalan
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </label>
              {o.status === "paid" && (
                <p className="helper">
                  Dengan membatalkan, kamu menyatakan dana sudah dikembalikan
                  manual. Aplikasi tidak mengirim uang.
                </p>
              )}
              <button
                className="button red-bg full"
                disabled={busy || !reason.trim()}
                onClick={() => run({ type: "cancel", id: o.id, reason })}
              >
                Konfirmasi pembatalan
              </button>
            </>
          ) : (
            <button className="danger-link" onClick={() => setCancel(true)}>
              Batalkan transaksi
            </button>
          )}
        </div>
      )}
      {o.reason && <p>Alasan: {o.reason}</p>}
    </Dialog>
  );
}
function Products({ data, run, busy }: Actions) {
  const [editing, setEditing] = useState<Product | null>(null),
    [zero, setZero] = useState(false);
  return (
    <>
      <div className="panel-heading">
        <p>
          {data.products.filter((p) => p.active).length} menu aktif · HPP belum
          diisi harus dilengkapi sebelum berjualan.
        </p>
        <button
          className="button yellow-bg small"
          onClick={() => {
            setZero(false);
            setEditing({
              id: crypto.randomUUID(),
              name: "",
              description: "",
              category: "Ketan Susu",
              price: 0,
              cost: null,
              art: 0,
              active: true,
              available: true,
            });
          }}
        >
          <Plus size={16} /> Tambah menu
        </button>
      </div>
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Menu</th>
              <th>Harga jual</th>
              <th>HPP / porsi</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <small>{p.category}</small>
                </td>
                <td>{rupiah(p.price)}</td>
                <td>
                  {p.cost === null ? (
                    <span className="status pending">Belum diisi</span>
                  ) : (
                    rupiah(p.cost)
                  )}
                </td>
                <td>
                  {!p.active
                    ? "Diarsipkan"
                    : p.available
                      ? "Tersedia"
                      : "Habis"}
                </td>
                <td>
                  <button
                    className="text-link"
                    onClick={() => {
                      setZero(p.cost === 0);
                      setEditing({ ...p });
                    }}
                  >
                    Edit ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Dialog title="Atur menu" close={() => setEditing(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run({ type: "product", product: editing }))
                setEditing(null);
            }}
          >
            <label>
              Nama produk
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              Kategori
              <select
                value={editing.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    category: e.target.value as Product["category"],
                  })
                }
              >
                <option>Ketan Susu</option>
                <option>Dimsum</option>
              </select>
            </label>
            <label>
              Deskripsi
              <textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <div className="form-row">
              <label>
                Harga jual (Rp)
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={editing.price}
                  onChange={(e) =>
                    setEditing({ ...editing, price: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                HPP / porsi (Rp)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editing.cost ?? ""}
                  placeholder="Belum diisi"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      cost:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            {editing.cost === 0 && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={zero}
                  onChange={(e) => setZero(e.target.checked)}
                />
                Saya memastikan HPP Rp0 memang benar.
              </label>
            )}
            <label>
              URL foto (opsional, HTTPS)
              <input
                type="url"
                value={editing.image || ""}
                onChange={(e) =>
                  setEditing({ ...editing, image: e.target.value })
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={editing.available}
                onChange={(e) =>
                  setEditing({ ...editing, available: e.target.checked })
                }
              />
              Tersedia untuk dijual
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
              />
              Tampilkan produk (nonaktifkan untuk arsip)
            </label>
            <button
              className="button yellow-bg full"
              disabled={busy || (editing.cost === 0 && !zero)}
            >
              Simpan menu <Check size={17} />
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
function Transactions(props: Actions) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string | null>(null);
  const orders = props.data.orders.filter(
    (o) =>
      (o.number + " " + o.customer)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "all" || o.status === status),
  );
  return (
    <>
      <div className="report-toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Cari transaksi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nomor transaksi atau pelanggan"
          />
        </div>
        <select
          aria-label="Status transaksi"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Semua status</option>
          <option value="pending">Menunggu</option>
          <option value="paid">Lunas</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="voided">Dikembalikan</option>
        </select>
      </div>
      <section className="panel">
        {orders.length ? (
          <OrderTable orders={orders} onSelect={(o) => setSelected(o.id)} />
        ) : (
          <Empty text="Transaksi yang kamu cari belum ada." />
        )}
      </section>
      {selected && (
        <OrderDialog
          {...props}
          order={props.data.orders.find((o) => o.id === selected)!}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
function Expenses({ data, run, busy }: Actions) {
  return (
    <div className="expense-layout">
      <section className="panel">
        <h2>Tambah pengeluaran</h2>
        <p className="helper">
          Bahan dan kemasan per porsi masuk HPP. Jangan dicatat dua kali.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            if (
              await run({
                type: "expense",
                expense: {
                  id: crypto.randomUUID(),
                  date: String(f.get("date")),
                  category: String(f.get("category")),
                  description: String(f.get("description")),
                  amount: Number(f.get("amount")),
                },
              })
            )
              form.reset();
          }}
        >
          <label>
            Tanggal
            <input type="date" name="date" defaultValue={day()} required />
          </label>
          <label>
            Kategori
            <select name="category">
              {[
                "Transportasi",
                "Promosi",
                "Sewa",
                "Administrasi",
                "Lain-lain",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Deskripsi
            <input
              name="description"
              placeholder="Contoh: transportasi ke lokasi jualan"
              required
            />
          </label>
          <label>
            Nominal (Rp)
            <input name="amount" type="number" min="1" step="1" required />
          </label>
          <button className="button yellow-bg full" disabled={busy}>
            <Plus size={17} /> Catat pengeluaran
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Riwayat biaya</h2>
        {data.expenses.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pengeluaran</th>
                  <th>Tanggal</th>
                  <th>Nominal</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.description}</strong>
                      <small>{e.category}</small>
                    </td>
                    <td>{e.date}</td>
                    <td>{rupiah(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Pengeluaran operasional akan muncul di sini." />
        )}
      </section>
    </div>
  );
}
function Preferences({
  data,
  run,
  busy,
  content,
}: Actions & { content: boolean }) {
  const [settings, setSettings] = useState(data.settings),
    [uploadError, setUploadError] = useState(""),
    [resetReady, setResetReady] = useState(false);
  async function upload(file: File) {
    setUploadError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_500_000
    ) {
      setUploadError("Gunakan PNG, JPG, atau WebP maksimal 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setSettings((s) => ({ ...s, qris: String(reader.result) }));
    reader.readAsDataURL(file);
  }
  return (
    <section className="panel settings-panel">
      <h2>{content ? "Cerita di website" : "Identitas & pembayaran"}</h2>
      <p>
        {content
          ? "Konten tersimpan akan digunakan di halaman publik."
          : "QRIS diverifikasi manual oleh kasir setelah mengecek aplikasi merchant."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await run({ type: "settings", settings });
        }}
      >
        {content ? (
          <>
            <label>
              Cerita usaha
              <textarea
                rows={5}
                value={settings.story}
                onChange={(e) =>
                  setSettings({ ...settings, story: e.target.value })
                }
              />
            </label>
            <label>
              Nama tim & peran
              <textarea
                value={settings.team}
                onChange={(e) =>
                  setSettings({ ...settings, team: e.target.value })
                }
                placeholder="Isi nama anggota tim dan perannya"
              />
            </label>
            <label>
              Refleksi / pembelajaran
              <textarea
                rows={4}
                value={settings.reflection}
                onChange={(e) =>
                  setSettings({ ...settings, reflection: e.target.value })
                }
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Nama merchant
              <input
                required
                value={settings.merchant}
                onChange={(e) =>
                  setSettings({ ...settings, merchant: e.target.value })
                }
              />
            </label>
            <label>
              WhatsApp usaha (format 62… tanpa +)
              <input
                pattern="62[0-9]{8,13}"
                inputMode="numeric"
                value={settings.contact}
                onChange={(e) =>
                  setSettings({ ...settings, contact: e.target.value })
                }
                placeholder="Isi jika kontak sudah siap dipublikasikan"
              />
            </label>
            <label>
              Gambar QRIS asli
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) upload(e.target.files[0]);
                }}
              />
            </label>
            {uploadError && (
              <p role="alert" className="error">
                {uploadError}
              </p>
            )}
            {settings.qris ? (
              <>
                <img
                  className="qris"
                  src={settings.qris}
                  alt="Preview QRIS merchant"
                />
                <button
                  type="button"
                  className="danger-link"
                  onClick={() => setSettings({ ...settings, qris: "" })}
                >
                  Hapus QRIS
                </button>
              </>
            ) : (
              <div className="notice">
                Belum ada QRIS. Pembayaran QRIS dinonaktifkan sampai gambar
                disimpan.
              </div>
            )}
          </>
        )}
        <button className="button yellow-bg" disabled={busy}>
          Simpan perubahan <Check size={17} />
        </button>
      </form>
      {!content && (
        <div className="setup-note">
          <h3>
            {isDemo ? "Berikutnya: hubungkan Supabase" : "Pengelolaan akun"}
          </h3>
          <p>
            {isDemo
              ? "Mode demo hanya untuk mencoba alur. Ikuti README untuk membuat project Supabase, menjalankan migrasi, dan mengaktifkan login asli."
              : "Buat akun melalui Supabase Authentication dan tambahkan profil admin/kasir mengikuti README. Tidak ada pendaftaran publik."}
          </p>
          {isDemo && (
            <>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={resetReady}
                  onChange={(e) => setResetReady(e.target.checked)}
                />
                Saya ingin menghapus semua data simulasi di browser ini.
              </label>
              <button
                type="button"
                className="danger-link"
                disabled={!resetReady}
                onClick={() => {
                  localStorage.removeItem(storageKey);
                  sessionStorage.removeItem("ketansum-cart");
                  window.location.reload();
                }}
              >
                Reset demo lokal
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
