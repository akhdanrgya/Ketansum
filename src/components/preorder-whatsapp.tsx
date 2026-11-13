"use client";
import { useEffect, useState } from "react";
import { CAMPUS } from "@/lib/preorder-schedule";

export function PreorderWhatsApp({
  order,
  meetingPoint,
  proof,
}: {
  order: {
    number: string;
    scheduledAt: string;
    items?: { name: string; quantity: number }[];
  };
  meetingPoint: string;
  proof: File | null;
}) {
  const [canShare, setCanShare] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setCanShare(Boolean(proof && navigator.canShare?.({ files: [proof] })));
  }, [proof]);
  const date = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(order.scheduledAt));
  const items =
    order.items?.map((item) => `${item.quantity} ${item.name}`).join(", ") ||
    "sesuai pengajuan";
  const message = `Halo kak, saya ada pesanan ${items} untuk tanggal ${date} WIB di ${CAMPUS}${meetingPoint ? ` — ${meetingPoint}` : ""}. Mohon konfirmasi pesanan ya.\n\nNomor pengajuan: ${order.number}\nBukti pembayaran sudah saya unggah di website, bisa diperiksa di dashboard preorder.`;
  return (
    <section className="notice">
      <h3>Konfirmasi ke CS lewat WhatsApp</h3>
      <p>
        Pesanan sudah tersimpan. Lanjutkan pesan ke CS +62 816-907-670, lalu
        tekan Kirim di WhatsApp.
      </p>
      <a
        className="button yellow-bg"
        href={`https://wa.me/62816907670?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Buka WhatsApp CS
      </a>
      <p>
        Lampirkan screenshot pembayaran yang sama di chat. CS juga dapat
        memeriksa bukti di dashboard. Konfirmasi lewat WhatsApp tidak otomatis
        menyetujui pesanan atau menandainya lunas.
      </p>
      {canShare && proof && (
        <>
          <button
            type="button"
            className="button"
            onClick={async () => {
              try {
                await navigator.share({ files: [proof], text: message });
                setNotice(
                  "Periksa di WhatsApp apakah pesan dan gambar sudah terkirim ke CS.",
                );
              } catch (error) {
                if (!(error instanceof Error && error.name === "AbortError"))
                  setNotice(
                    "Belum bisa membagikan gambar. Buka WhatsApp CS dan lampirkan screenshot secara manual.",
                  );
              }
            }}
          >
            Bagikan bukti & pesan
          </button>
          <p>
            Pilih WhatsApp lalu kontak CS +62 816-907-670 di menu berbagi HP.
            Penerima tidak dipilih otomatis.
          </p>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
