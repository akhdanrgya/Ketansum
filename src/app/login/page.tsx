"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { isDemo, hasSupabase } from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const { error } = await createClient().auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (error) throw error;
      window.location.assign("/admin");
    } catch {
      setError("Login gagal. Periksa email, password, dan koneksi.");
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
                minLength={6}
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
