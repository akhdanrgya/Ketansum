"use client";
import { useEffect, useState } from "react";
type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};
export function Team() {
  const [users, setUsers] = useState<TeamMember[]>([]),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  async function load() {
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setUsers(body.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat tim.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(body: unknown) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      await load();
      setSuccess("Pengaturan tim tersimpan.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel team-panel">
      <h2>Akun tim</h2>
      <p>
        Kasir bisa membuka dashboard operasional, seluruh preorder tim, dan
        kasir. HPP, laba, pengeluaran, pengaturan, serta akun tim hanya untuk
        admin. Akun nonaktif langsung kehilangan akses data.
      </p>
      {error && (
        <p className="error banner" role="alert">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      {loading ? (
        <p>Memuat tim…</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Peran</th>
                <th>Akses</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role === "admin" ? "Admin" : "Kasir"}</td>
                  <td>
                    {u.role === "admin" ? (
                      <span className="status paid">Admin aktif</span>
                    ) : (
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() =>
                          save({
                            action: "active",
                            id: u.id,
                            active: !u.active,
                          })
                        }
                      >
                        {u.active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <details className="team-form">
        <summary>+ Buat akun kasir</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            if (
              await save({
                action: "create",
                name: data.get("name"),
                email: data.get("email"),
                password: data.get("password"),
              })
            )
              form.reset();
          }}
        >
          <label>
            Nama kasir
            <input name="name" required maxLength={100} autoComplete="off" />
          </label>
          <label>
            Email kasir
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
            />
          </label>
          <label>
            Password awal
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <p className="helper">
            Minimal 12 karakter, huruf besar, kecil, dan angka. Akun langsung
            aktif; tidak ada email otomatis.
          </p>
          <button className="button yellow-bg" disabled={busy}>
            {busy ? "Menyimpan…" : "Buat akun kasir"}
          </button>
        </form>
      </details>
    </section>
  );
}
