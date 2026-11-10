"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function AdminPwa() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(false),
    [offline, setOffline] = useState(false),
    [help, setHelp] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const sync = () => {
      setOffline(!navigator.onLine);
      setInstalled(
        display.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    };
    const offer = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", done);
    display.addEventListener("change", sync);
    if (
      "serviceWorker" in navigator &&
      window.isSecureContext &&
      process.env.NODE_ENV === "production"
    )
      navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/" })
        .catch(() => {});
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", done);
      display.removeEventListener("change", sync);
    };
  }, []);
  return (
    <div className="pwa-panel">
      {offline && (
        <p role="alert" className="notice">
          Koneksi terputus. Sambungkan internet sebelum menyimpan atau
          mengonfirmasi pembayaran. Transaksi tidak dikirim otomatis.
        </p>
      )}
      {!installed && (
        <>
          <button
            type="button"
            className="pwa-install"
            onClick={async () => {
              setError("");
              if (!prompt) {
                setHelp(!help);
                return;
              }
              try {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
              } catch {
                setError(
                  "Instalasi belum tersedia. Gunakan menu browser untuk menambahkan ke layar utama.",
                );
              }
            }}
          >
            ＋ Pasang admin di HP
          </button>
          {help && (
            <p className="helper">
              Android: buka menu browser → Instal aplikasi / Tambahkan ke layar
              utama. iPhone: buka di Safari → Bagikan → Tambahkan ke Layar
              Utama. Gunakan alamat HTTPS aplikasi. Login tetap diperlukan.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
