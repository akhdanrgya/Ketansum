"use client";
import { useState } from "react";
import type { Workspace, Command } from "@/lib/types";
import { rupiah } from "@/lib/finance";
import { scheduleLabel } from "./preorders";
export function PreorderRequests({
  data,
  run,
  busy,
}: {
  data: Workspace;
  run: (command: Command) => Promise<boolean>;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const requests = data.preorderRequests || [];
  const pending = requests.filter((r) => r.reviewStatus === "pending");
  return (
    <section className="panel review-queue">
      <h2>Pengajuan pelanggan ({pending.length})</h2>
      <p>
        Belum masuk daftar PO. Setujui setelah memeriksa pesanan dan bukti;
        pembayaran tetap diverifikasi terpisah.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!pending.length && <p>Belum ada pengajuan yang menunggu persetujuan.</p>}
      {pending.map((r) => (
        <article key={r.id} className="request-card">
          <h3>
            {r.customer} · {rupiah(r.total)}
          </h3>
          <p>{scheduleLabel(r.preorder.scheduledAt)}</p>
          <p>{r.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</p>
          <p>{r.preorder.address}</p>
          <p>WhatsApp: {r.preorder.phone}</p>
          {r.preorder.notes && <p>{r.preorder.notes}</p>}
          <small className="preorder-number">{r.number}</small>
          <button
            className="text-link"
            onClick={() => {
              setExpanded(expanded === r.id ? null : r.id);
              setReason("");
              setError("");
            }}
          >
            Periksa bukti & putuskan
          </button>
          {expanded === r.id && (
            <div>
              <a
                href={`/api/payment-proof/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka bukti ukuran penuh ↗
              </a>
              <img
                className="payment-proof"
                src={`/api/payment-proof/${r.id}`}
                alt={`Bukti pembayaran pengajuan ${r.number}`}
                loading="lazy"
              />
              <p className="helper">
                Cek nominal dan transaksi di aplikasi merchant. Setujui hanya
                jika pesanan bisa dipenuhi. Penolakan setelah pelanggan membayar
                perlu ditindaklanjuti lewat WhatsApp; aplikasi tidak mengirim
                refund otomatis.
              </p>
              <label>
                Alasan (wajib untuk menolak)
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="preorder-actions">
                <button
                  className="button yellow-bg"
                  disabled={busy}
                  onClick={async () => {
                    setError("");
                    if (
                      await run({
                        type: "review",
                        id: r.id,
                        decision: "approved",
                        reason,
                      })
                    ) {
                      setExpanded(null);
                    } else
                      setError(
                        "Persetujuan belum terkonfirmasi. Muat ulang untuk memeriksa hasil.",
                      );
                  }}
                >
                  Setujui → masukkan ke PO
                </button>
                <button
                  className="button red-bg"
                  disabled={busy || !reason.trim()}
                  onClick={async () => {
                    setError("");
                    if (
                      await run({
                        type: "review",
                        id: r.id,
                        decision: "rejected",
                        reason,
                      })
                    ) {
                      setExpanded(null);
                    } else
                      setError(
                        "Penolakan belum terkonfirmasi. Muat ulang untuk memeriksa hasil.",
                      );
                  }}
                >
                  Tolak pengajuan
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {requests.some((r) => r.reviewStatus === "rejected") && (
        <details>
          <summary>Riwayat ditolak</summary>
          {requests
            .filter((r) => r.reviewStatus === "rejected")
            .map((r) => (
              <p key={r.id}>
                {r.customer} · {r.number} · {r.reviewReason}
              </p>
            ))}
        </details>
      )}
    </section>
  );
}
