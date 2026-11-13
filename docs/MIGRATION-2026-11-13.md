# Migrasi Supabase — 13 November 2026

Target: `xfenrwdrqrovhuluczff.supabase.co` (Ketansum).

Pemilik memilih mulai kosong, tanpa memindahkan transaksi atau pengeluaran lama. Project lama tidak dimodifikasi.

Diterapkan melalui SQL Editor sebagai satu transaksi:
- `202611090001_initial.sql`: skema, RLS, RPC, enam menu.
- `202611100002_security.sql`: pembatasan login dan validasi transaksi.

Seed admin menggunakan kredensial dari `.env.local`. Login, profil admin aktif dan akses workspace berhasil diverifikasi. Seed bisnis memasukkan harga/HPP dari `docs/HPP.md`, QRIS asli dan nama merchant. Verifikasi: enam produk, nol transaksi, nol pengeluaran; workspace anonim ditolak dan fungsi pembatasan login tersedia.

Untuk Vercel, samakan URL Supabase, publishable key, dan secret key pada environment Production dengan project baru lalu redeploy. `APP_ORIGIN` di Vercel tetap domain HTTPS production, bukan alamat lokal. Perubahan environment Vercel belum dilakukan dalam migrasi ini.

## Penambahan preorder

`202611130003_preorders.sql` diterapkan melalui SQL Editor setelah persetujuan pemilik untuk akses preorder lintas tim. Hasil SQL Editor: Success. Migrasi mempertahankan order lama, menambahkan versi skema 3 serta operasi jadwal/status preorder. Pengujian lokal memverifikasi snapshot harga/HPP, retry pembayaran, konflik versi, hak kasir, refund khusus admin dan akun nonaktif. Build production serta typecheck lolos.
