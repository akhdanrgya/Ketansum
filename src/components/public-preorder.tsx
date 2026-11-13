"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PublicProduct } from "@/lib/types";
import { rupiah } from "@/lib/finance";
import {
  CAMPUS,
  deliveryDateLabel,
  deliveryTimes,
} from "@/lib/preorder-schedule";
import { PreorderWhatsApp } from "./preorder-whatsapp";
import { ProductArt } from "./product-art";
type Quote = {
  items?: { name: string; quantity: number; price: number }[];
  number: string;
  total: number;
  scheduledAt: string;
  submitted: boolean;
  reviewStatus: "pending" | "approved" | "rejected";
  qris?: string;
  merchant?: string;
};
const storageKey = "ketansum-public-preorder-token";
export function PublicPreorder({
  products,
  dates,
}: {
  products: PublicProduct[];
  dates: string[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({}),
    [quote, setQuote] = useState<Quote | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [proof, setProof] = useState(""),
    [fileName, setFileName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [meetingPoint, setMeetingPoint] = useState("");
  const token = useRef("");
  const total = products.reduce(
    (sum, p) => sum + p.price * (quantities[p.id] || 0),
    0,
  );
  async function call(body: Record<string, unknown>) {
    const r = await fetch("/api/preorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, token: token.current }),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Pesanan belum terkonfirmasi.");
    return data as Quote;
  }
  useEffect(() => {
    let live = true;
    try {
      token.current = sessionStorage.getItem(storageKey) || "";
    } catch {}
    if (token.current) {
      setBusy(true);
      call({ action: "quote" })
        .then((q) => {
          if (live) setQuote(q);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) {
            setReady(true);
            setBusy(false);
          }
        });
    } else setReady(true);
    return () => {
      live = false;
    };
  }, []);
  function remember() {
    if (!token.current)
      token.current = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
    try {
      sessionStorage.setItem(storageKey, token.current);
    } catch {}
  }
  return (
    <div className="public-checkout">
      <div className="checker" />
      <header className="checkout-header">
        <Link href="/" className="wordmark">
          ketansum<span>★</span>
        </Link>
        <Link href="/">← Kembali</Link>
      </header>
      <main className="checkout-main">
        <span className="eyebrow">PREORDER KAMPUS C</span>
        <h1>
          Pesan sekarang.
          <br />
          Ketemu di kampus!
        </h1>
        <p className="checkout-intro">
          Khusus <strong>{CAMPUS}</strong>. Pengiriman Senin & Kamis, pukul{" "}
          <strong>10.30–13.00 WIB</strong>. Pilih tanggal mulai besok, maksimal
          60 hari ke depan. Titik temu dikonfirmasi lewat WhatsApp.
        </p>
        <div className="notice">
          1. Pilih menu & jadwal → 2. Bayar QRIS & unggah bukti → 3. Tim
          menyetujui pengajuan. Bukti upload tidak otomatis berarti lunas. Jika
          pengajuan ditolak setelah membayar, tim menghubungi kamu untuk
          penyelesaian/pengembalian dana.
        </div>
        {error && (
          <p className="error banner" role="alert">
            {error}
          </p>
        )}
        {!ready ? (
          <p>Memuat sesi pesanan…</p>
        ) : quote ? (
          <section className="panel checkout-payment">
            <h2>
              {quote.submitted
                ? "Pengajuan terkirim!"
                : "Cek pesanan & pembayaran"}
            </h2>
            <p className="preorder-number">{quote.number}</p>
            <ul>
              {quote.items?.map((item, index) => (
                <li key={index}>
                  {item.quantity} × {item.name} —{" "}
                  {rupiah(item.quantity * item.price)}
                </li>
              ))}
            </ul>
            <strong className="checkout-total">{rupiah(quote.total)}</strong>
            <p>
              {new Intl.DateTimeFormat("id-ID", {
                timeZone: "Asia/Jakarta",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(quote.scheduledAt))}{" "}
              WIB
            </p>
            <p>{CAMPUS}</p>
            {quote.submitted ? (
              <>
                <p role="status" className="notice">
                  {quote.reviewStatus === "approved"
                    ? "Disetujui tim — pesanan sudah masuk preorder. Status pembayaran diverifikasi terpisah."
                    : quote.reviewStatus === "rejected"
                      ? "Pengajuan ditolak. Tim akan menghubungi kamu melalui WhatsApp. Jangan membayar ulang."
                      : "Menunggu persetujuan admin/kasir. Pesanan belum masuk daftar PO. Simpan nomor pengajuan ini."}
                </p>
                <PreorderWhatsApp
                  order={quote}
                  meetingPoint={meetingPoint}
                  proof={proofFile}
                />
                <button
                  className="button yellow-bg"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      setQuote(await call({ action: "quote" }));
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Gagal memuat status.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Periksa status persetujuan
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    try {
                      sessionStorage.removeItem(storageKey);
                    } catch {}
                    token.current = "";
                    setQuote(null);
                    setProofFile(null);
                    setMeetingPoint("");
                    setProof("");
                    setFileName("");
                    setQuantities({});
                    setError("");
                  }}
                >
                  Buat pesanan baru
                </button>
                <Link className="button" href="/">
                  Kembali ke beranda
                </Link>
              </>
            ) : (
              <>
                <p>
                  Bayar tepat sesuai total ke <strong>{quote.merchant}</strong>.
                  Setelah membayar, unggah screenshot bukti di bawah. Jangan
                  bayar dua kali saat koneksi terputus.
                </p>
                {quote.qris && (
                  <img
                    className="qris"
                    src={quote.qris}
                    alt={`QRIS ${quote.merchant}`}
                  />
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    try {
                      if (!proof)
                        throw Error("Unggah bukti pembayaran terlebih dahulu.");
                      setQuote(await call({ action: "submit", proof }));
                      setProof("");
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Pengiriman gagal. Coba ulang tanpa membayar lagi.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Screenshot bukti pembayaran
                    <input
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={async (e) => {
                        setProof("");
                        setFileName("");
                        setProofFile(null);
                        setError("");
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (
                          file.size > 1_500_000 ||
                          !["image/jpeg", "image/png", "image/webp"].includes(
                            file.type,
                          )
                        ) {
                          setError(
                            "Gunakan JPG, PNG atau WebP maksimal 1,5 MB.",
                          );
                          e.target.value = "";
                          return;
                        }
                        try {
                          const result = await new Promise<string>(
                            (resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () =>
                                resolve(String(reader.result));
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            },
                          );
                          setProof(result);
                          setProofFile(file);
                          setFileName(file.name);
                        } catch {
                          setError("File gagal dibaca. Pilih ulang gambar.");
                        }
                      }}
                    />
                  </label>
                  <p className="helper">
                    JPG/PNG/WebP maksimal 1,5 MB. Bukti hanya dapat dilihat
                    admin/kasir. Hindari menyertakan saldo atau informasi lain
                    yang tidak diperlukan.
                  </p>
                  {fileName && <p>Terpilih: {fileName}</p>}
                  <label className="checkbox">
                    <input required type="checkbox" />
                    Saya sudah membayar nominal yang sesuai dan mengizinkan tim
                    menghubungi saya untuk pesanan ini.
                  </label>
                  <button
                    className="button yellow-bg"
                    disabled={busy || !proof}
                  >
                    {busy ? "Mengirim…" : "Kirim pengajuan preorder"}
                  </button>
                </form>
              </>
            )}
          </section>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const values = new FormData(e.currentTarget);
              const items = Object.entries(quantities)
                .filter(([, q]) => q > 0)
                .map(([productId, quantity]) => ({ productId, quantity }));
              if (!items.length) {
                setError("Pilih minimal satu menu.");
                return;
              }
              setBusy(true);
              try {
                remember();
                setMeetingPoint(String(values.get("meetingPoint") || ""));
                setQuote(
                  await call({
                    action: "quote",
                    order: {
                      customer: values.get("customer"),
                      phone: String(values.get("phone")).replace(/[\s+-]/g, ""),
                      meetingPoint: values.get("meetingPoint"),
                      notes: values.get("notes"),
                      date: values.get("date"),
                      time: values.get("time"),
                      items,
                      expectedTotal: total,
                    },
                  }),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Periksa koneksi.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>1. Mau pesan apa?</h2>
            <div className="checkout-products">
              {products.map((p) => (
                <article className="panel" key={p.id}>
                  <ProductArt art={p.art} name={p.name} image={p.image} />
                  <h3>{p.name}</h3>
                  <p>{rupiah(p.price)}</p>
                  <label>
                    Jumlah {p.name}
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={quantities[p.id] || 0}
                      disabled={!p.available || busy}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [p.id]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  {!p.available && <p>Lagi habis</p>}
                </article>
              ))}
            </div>
            <section className="panel checkout-customer">
              <h2>2. Data & jadwal pengiriman</h2>
              <div className="preorder-fields">
                <label>
                  Nama pelanggan
                  <input
                    name="customer"
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Nomor WhatsApp
                  <input
                    name="phone"
                    type="tel"
                    required
                    maxLength={20}
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                  />
                </label>
                <label>
                  Tanggal antar
                  <select name="date" required>
                    <option value="">Pilih Senin atau Kamis</option>
                    {dates.map((d) => (
                      <option value={d} key={d}>
                        {deliveryDateLabel(d)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jam antar (WIB)
                  <select name="time" required>
                    {deliveryTimes.map((t) => (
                      <option key={t} value={t}>
                        {t} WIB
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Titik temu di Kampus C
                  <input
                    name="meetingPoint"
                    required
                    maxLength={300}
                    placeholder="Gedung / kelas / lobi"
                  />
                </label>
                <label>
                  Catatan (opsional)
                  <textarea name="notes" maxLength={500} />
                </label>
              </div>
              <p>
                Pengiriman hanya {CAMPUS}. Tidak melayani alamat di luar kampus
                ini.
              </p>
              <strong className="checkout-total">Total: {rupiah(total)}</strong>
              <p className="helper">
                Maksimal 50 porsi. Total final dikunci server sebelum QRIS
                ditampilkan.
              </p>
              <button className="button yellow-bg" disabled={busy || !total}>
                {busy ? "Memeriksa pesanan…" : "Lanjut ke QRIS"}
              </button>
            </section>
          </form>
        )}
      </main>
      <footer className="checkout-footer">
        Ketansum · Manisnya ketan, gurihnya dimsum.
      </footer>
    </div>
  );
}
