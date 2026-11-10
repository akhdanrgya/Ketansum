"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { isDemo, hasSupabase } from "@/lib/data";

export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email")),
          password: String(form.get("password")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      window.location.assign(
        result.redirect === "/admin/kasir" ? "/admin/kasir" : "/admin",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login gagal. Periksa koneksi.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="checker" />
      <Link href="/" className="back-link">
        <ArrowLeft size={18} /> Balik ke website
      </Link>
      <section className="login-card">
        <span className="login-icon">
          <LockKeyhole />
        </span>
        <span className="eyebrow">RUANG TIM KETANSUM</span>
        <h1>
          Di balik
          <br />
          yang enak.
        </h1>
        <p>Kelola menu, layani pembeli, dan lihat perjalanan usahamu.</p>
        {isDemo ? (
          <>
            <div className="notice">
              Mode demo lokal. Tanpa login, tanpa data penjualan asli. Data
              hanya tersimpan di browser ini.
            </div>
            <Link className="button yellow-bg" href="/admin">
              Masuk demo admin <ArrowUpRight />
            </Link>
          </>
        ) : hasSupabase ? (
          <form onSubmit={login}>
            <label>
              Email
              <input
                name="email"
                maxLength={254}
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={256}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button disabled={busy} className="button yellow-bg">
              {busy ? "Memeriksa…" : "Masuk ruang tim"} <ArrowUpRight />
            </button>
          </form>
        ) : (
          <div className="notice">
            Supabase belum dikonfigurasi. Isi environment sesuai README atau
            aktifkan mode demo lokal.
          </div>
        )}
        <small>Akses khusus pengelola & kasir Ketansum.</small>
      </section>
    </main>
  );
}
