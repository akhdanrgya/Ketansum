import Link from "next/link";
export default function NotFound() {
  return (
    <main className="login-page">
      <section className="login-card">
        <span className="eyebrow">404 · HALAMAN TIDAK ADA</span>
        <h1>
          Nyasar
          <br />
          ke dapur?
        </h1>
        <p>Yuk balik ke menu Ketansum.</p>
        <Link href="/" className="button yellow-bg">
          Balik ke beranda ↗
        </Link>
      </section>
    </main>
  );
}
