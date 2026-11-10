"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Ups, sebentar.</h1>
        <p>
          Halaman belum bisa dimuat. Periksa koneksi dan konfigurasi, lalu coba
          lagi.
        </p>
        <button className="button yellow-bg" onClick={reset}>
          Coba lagi
        </button>
      </section>
    </main>
  );
}
