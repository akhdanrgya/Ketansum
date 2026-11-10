# Ketansum

Next.js + TypeScript + Tailwind CSS + Motion + Supabase. Website portfolio bertema pop-art, dengan workspace admin dan kasir.

## Jalankan lokal

Gunakan Node.js 22 atau lebih baru.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Buka http://127.0.0.1:3000. Folder ini sudah memiliki `.env.local` untuk demo lokal. Jangan menimpa file tersebut jika sudah mengisi konfigurasi sendiri.

- `/`: website publik, enam menu sesuai poster, filter kategori, cerita, portfolio, dan kontak.
- `/login`: masuk demo atau login Supabase.
- `/admin`: dashboard omzet, HPP, biaya, laba, dan ekspor CSV.
- `/admin/kasir`: keranjang, transaksi pending, pembayaran tunai/QRIS manual, cetak struk.
- `/admin/produk`: kelola harga, HPP, ketersediaan, arsip produk, URL foto.
- `/admin/transaksi`: pencarian, filter status, pembayaran lanjutan, pembatalan.
- `/admin/pengeluaran`: catat biaya operasional.
- `/admin/laporan`: periode laporan dan CSV.
- `/admin/konten`: cerita, anggota tim, refleksi.
- `/admin/pengaturan`: merchant, kontak, dan upload gambar QRIS.

## Mode demo

`NEXT_PUBLIC_DEMO_MODE=true` secara eksplisit mengaktifkan demo tanpa autentikasi. Tidak ada transaksi atau HPP buatan. Isi HPP produk dulu untuk mencoba penjualan. Data tersimpan di localStorage browser (`ketansum-demo-v1`), keranjang di sessionStorage. Data demo hanya untuk eksperimen; bukan sistem kasir operasional, tidak tersinkron antarperangkat, dan dapat hilang jika penyimpanan browser dihapus.

Untuk reset, gunakan Pengaturan → Reset demo lokal. Alternatifnya, hapus key `ketansum-demo-v1` dari Local Storage dan `ketansum-cart` dari Session Storage melalui developer tools browser. Foto produk awal ditampilkan dari area poster asli melalui CSS, sehingga masih mengandung elemen poster. Ganti dengan foto produk terpisah melalui URL foto untuk hasil final.

## Hubungkan Supabase nanti

1. Buat project Supabase baru.
2. Jalankan `supabase/migrations/202611090001_initial.sql` sekali melalui SQL Editor. File ini membuat skema, RLS, fungsi transaksi, audit, dan seed menu. Jalankan pada project baru, bukan database yang sudah memiliki tabel dengan nama sama.
3. Buat user admin lewat Authentication → Users. Salin UUID user dan jalankan SQL berikut, mengganti UUID contoh dengan user yang benar:

```sql
insert into public.profiles(id, name, role)
values ('UUID-USER-DARI-AUTH', 'Admin Ketansum', 'admin');
```

4. Untuk kasir, buat user Auth lalu insert profil dengan role `cashier`. Tidak ada signup publik. Perubahan role hanya melalui dashboard database tepercaya.
5. Isi `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=KEY-PUBLIK-PROJECT
NEXT_PUBLIC_DEMO_MODE=false
```

6. Restart `npm run dev`, login dengan akun tadi, lalu isi HPP asli dan gambar QRIS asli.
7. Periksa acceptance checklist dan pengujian akses sebelum dipakai untuk uang nyata.

Publishable key boleh digunakan di browser. Jangan menaruh service-role key di frontend. Aplikasi ini tidak membutuhkan service-role key.

## Integritas & hak akses

- Mutasi live melalui RPC PostgreSQL security-definer dengan pemeriksaan role aktif dan search path kosong.
- Transaksi menyimpan snapshot harga/HPP; server menghitung ulang total.
- Create memakai UUID idempotency dan advisory lock; pembayaran memakai row lock dan status transition.
- Pembatalan paid hanya admin, dengan alasan dan entri pembalik unik. Dana dikembalikan manual di luar aplikasi.
- Data HPP berada pada tabel terpisah, tidak dapat diakses publik/kasir. RPC kasir menyamarkan biaya dan hanya mengembalikan transaksi sendiri.
- Route admin, API, dan RLS berlapis; akun tanpa profil aktif ditolak.
- Semua nominal dalam rupiah bulat. Laporan memakai waktu Asia/Jakarta.
- QRIS adalah gambar statis; tidak ada webhook atau konfirmasi otomatis.
- HPP standar mengestimasi laba operasional, bukan arus kas atau akuntansi persediaan lengkap.

## Verifikasi

```sh
npm run typecheck
npm test
npm run build
npm start
```

Tes unit memeriksa HPP wajib, nominal kurang, snapshot, idempotency, pembatalan lintas periode, batas akses demo, serta timezone. Tes database menjalankan migrasi dan RPC pada PostgreSQL WASM (PGlite), termasuk isolasi kasir, akses publik, snapshot, idempotency, dan pembatalan. Ini belum menggantikan pengujian Auth, konkurensi, dan deployment pada Supabase nyata.

## Batas setup saat ini

- Supabase belum diprovisikan karena pengguna meminta setup lokal dulu. Migrasi dan autentikasi live harus diuji pada project Supabase sebelum produksi.
- Upload QRIS disimpan sebagai data URL pada pengaturan (maks. file 1,5 MB) agar demo dan adapter live memakai format sama. Pindahkan media ke Supabase Storage saat pengembangan produksi; bucket/storage policy belum dibuat.
- Foto produk menggunakan URL; belum ada uploader media produk/galeri. Galeri kegiatan menunggu aset asli.
- Pengelolaan akun tim melalui dashboard Supabase; belum ada UI undang akun.
- Pengeluaran bisa ditambah, belum ada edit/bukti lampiran. Transaksi baru memiliki pencarian/status; filter tanggal tersedia pada laporan.
- Tidak ada checkout pelanggan, payment gateway, inventori bahan, sinkronisasi realtime, offline POS, atau deployment dalam setup lokal ini.
- Belum ada klaim bahwa seluruh acceptance criteria PRD sudah selesai. PRD tetap menjadi backlog untuk tahap berikutnya.

## Struktur

```text
src/app/               Route publik, login, admin, dan API
src/components/        Landing page, workspace, product art
src/lib/               Tipe data, data menu, kalkulasi, reducer demo
src/lib/supabase/      Client SSR & browser
src/proxy.ts           Refresh sesi dan penjagaan route
supabase/migrations/   Skema dan operasi atomik
public/                Poster referensi asli
tests/                Tes perhitungan dan state transaksi
```

Build memakai Webpack karena subprocess Turbopack dibatasi pada lingkungan setup. Server development tetap memakai default Next.js.

## Seed akun admin

Konfigurasi lokal `.env.local` tidak masuk Git. Isi `SUPABASE_SECRET_KEY` (atau legacy `SUPABASE_SERVICE_ROLE_KEY`), `KETANSUM_ADMIN_EMAIL`, dan `KETANSUM_ADMIN_PASSWORD`. Key rahasia hanya untuk script terminal, tidak memakai awalan `NEXT_PUBLIC`.

```sh
npm run supabase:check
npm run seed:admin
```

Seed memeriksa migrasi, membuat akun Auth dengan email terkonfirmasi tanpa mengirim email, lalu membuat profil admin aktif. Jika akun sudah ada, password tidak ditimpa; kredensial seed harus cocok sebelum profil diperbarui. Seed memverifikasi login dan akses workspace, lalu menutup sesi tes. Aman dijalankan ulang untuk melengkapi profil jika langkah sebelumnya terputus.

Setelah pemeriksaan dan seed berhasil, set `NEXT_PUBLIC_DEMO_MODE=false` lalu restart server. Untuk production, pastikan mode demo dimatikan. Publishable key saja tidak cukup menjalankan Admin API.
