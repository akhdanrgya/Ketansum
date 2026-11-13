# Ketansum

Next.js + TypeScript + Tailwind CSS + Motion + Supabase. Website portfolio bertema pop-art, dengan workspace admin dan kasir.

## Jalankan lokal

Gunakan Node.js 22 atau lebih baru.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Buka http://127.0.0.1:3000. Folder ini sudah memiliki `.env.local` untuk konfigurasi lokal. Jangan menimpa file tersebut jika sudah mengisi konfigurasi sendiri.

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

`NEXT_PUBLIC_DEMO_MODE=true` mengaktifkan demo tanpa autentikasi hanya pada development. Production selalu memerlukan login. Tidak ada transaksi atau HPP buatan. Isi HPP produk dulu untuk mencoba penjualan. Data tersimpan di localStorage browser (`ketansum-demo-v1`), keranjang di sessionStorage. Data demo hanya untuk eksperimen; bukan sistem kasir operasional, tidak tersinkron antarperangkat, dan dapat hilang jika penyimpanan browser dihapus.

Untuk reset, gunakan Pengaturan → Reset demo lokal. Alternatifnya, hapus key `ketansum-demo-v1` dari Local Storage dan `ketansum-cart` dari Session Storage melalui developer tools browser. Foto produk awal ditampilkan dari area poster asli melalui CSS, sehingga masih mengandung elemen poster. Ganti dengan foto produk terpisah melalui URL foto untuk hasil final.

## Konfigurasi Supabase

1. Buat project Supabase baru.
2. Jalankan `supabase/migrations/202611090001_initial.sql` sekali melalui SQL Editor. File ini membuat skema, RLS, fungsi transaksi, audit, dan seed menu. Jalankan pada project baru, bukan database yang sudah memiliki tabel dengan nama sama.
3. Jalankan juga `supabase/migrations/202611100002_security.sql` di SQL Editor untuk pembatasan login dan validasi pembayaran.
4. Buat user admin lewat Authentication → Users. Salin UUID user dan jalankan SQL berikut, mengganti UUID contoh dengan user yang benar:

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

Publishable key boleh digunakan di browser. Jangan menaruh service-role key di frontend. Server membutuhkan `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY` untuk pembatasan login dan pengelolaan akun kasir. Key ini tidak boleh memakai awalan `NEXT_PUBLIC`. Saat deployment, isi `APP_ORIGIN` dengan origin HTTPS situs yang persis sama.

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

- Project Supabase terhubung dan akun admin terverifikasi. QRIS asli dan HPP keenam menu sudah tersimpan. Patch `202611100002_security.sql` sudah diterapkan pada project Ketansum. Mode demo lokal sudah dinonaktifkan. Login melalui API aplikasi, cookie HttpOnly/SameSite, workspace admin, pengelolaan tim, penolakan akses anonim/lintas origin, dan logout berhasil diverifikasi pada 10 November 2026.
- Upload QRIS disimpan sebagai data URL pada pengaturan (maks. file 1,5 MB) agar demo dan adapter live memakai format sama. Pindahkan media ke Supabase Storage saat pengembangan produksi; bucket/storage policy belum dibuat.
- Foto produk menggunakan URL; belum ada uploader media produk/galeri. Galeri kegiatan menunggu aset asli.
- Admin dapat membuat akun kasir dan mengaktifkan/menonaktifkannya di Pengaturan. Tidak ada signup publik. Reset password melalui pengelola Supabase; email undangan tidak dikirim otomatis.
- Pengeluaran bisa ditambah, belum ada edit/bukti lampiran. Transaksi baru memiliki pencarian/status; filter tanggal tersedia pada laporan.
- Tidak ada checkout pelanggan, payment gateway, inventori bahan, sinkronisasi realtime, offline POS, atau deployment dalam setup lokal ini.
- Belum ada klaim bahwa seluruh acceptance criteria PRD sudah selesai. PRD tetap menjadi backlog untuk tahap berikutnya.

## Struktur

```text
src/app/               Route publik, login, admin, dan API
src/components/        Landing page, workspace, product art
src/lib/               Tipe data, data menu, kalkulasi, reducer demo
src/lib/supabase/      Client SSR & service server-only
src/proxy.ts           Refresh sesi dan penjagaan route
supabase/migrations/   Skema dan operasi atomik
public/                Poster referensi asli
tests/                Tes perhitungan dan state transaksi
```

Build memakai Webpack karena subprocess Turbopack dibatasi pada lingkungan setup. Server development tetap memakai default Next.js.

## Seed akun admin

Konfigurasi lokal `.env.local` tidak masuk Git. Isi `SUPABASE_SECRET_KEY` (atau legacy `SUPABASE_SERVICE_ROLE_KEY`), `KETANSUM_ADMIN_EMAIL`, dan `KETANSUM_ADMIN_PASSWORD`. Key rahasia dipakai server dan script terminal, tidak memakai awalan `NEXT_PUBLIC`.

```sh
npm run supabase:check
npm run seed:admin
```

Seed memeriksa migrasi, membuat akun Auth dengan email terkonfirmasi tanpa mengirim email, lalu membuat profil admin aktif. Jika akun sudah ada, password tidak ditimpa; kredensial seed harus cocok sebelum profil diperbarui. Seed memverifikasi login dan akses workspace, lalu menutup sesi tes. Aman dijalankan ulang untuk melengkapi profil jika langkah sebelumnya terputus.

Setelah pemeriksaan dan seed berhasil, set `NEXT_PUBLIC_DEMO_MODE=false` lalu restart server. Untuk production, pastikan mode demo dimatikan. Publishable key saja tidak cukup menjalankan Admin API.

## Data usaha dan pengamanan

`npm run seed:business` menyimpan QRIS asli, nama merchant, harga jual, serta HPP enam menu. Lihat [rincian HPP](docs/HPP.md); menjalankan ulang script akan menerapkan kembali nilai tersebut. Transaksi sebelumnya tetap memakai snapshot HPP saat dibuat.

Login berjalan di server dengan cookie HttpOnly/SameSite. Pembatasan login: delapan percobaan per email per 15 menit, selain proteksi Supabase Auth. Mutasi memerlukan origin yang sama. API memeriksa akun aktif dan role pada setiap request. Produksi tidak mengizinkan bypass demo.

Pembayaran QRIS memerlukan pemeriksaan uang masuk di aplikasi merchant dan konfirmasi eksplisit. Pembatalan transaksi lunas hanya oleh admin setelah pengembalian dana manual. Tidak ada pembayaran otomatis dari foto QR.

Alamat lokal operasional: `http://127.0.0.1:3000` (`APP_ORIGIN` harus cocok). Jika alamat atau port berubah, sesuaikan `APP_ORIGIN` dan restart server. Saat deployment, ganti dengan origin HTTPS situs.

## Admin mobile & PWA

Admin memiliki navigasi bawah pada layar HP, kartu transaksi, layout kasir satu kolom, form minimal 16px, serta jarak aman untuk notch/home indicator. Tombol **Pasang admin di HP** menawarkan instalasi jika browser mendukungnya, atau menampilkan petunjuk manual.

- Android: menu browser → Instal aplikasi / Tambahkan ke layar utama.
- iPhone: Safari → Bagikan → Tambahkan ke Layar Utama.
- App membuka `/admin`; sesi yang berakhir tetap diarahkan ke login.
- Untuk instalasi dari HP, deploy ke domain **HTTPS** dan set `APP_ORIGIN` ke domain tersebut. `127.0.0.1` di HP menunjuk HP itu sendiri, bukan laptop. Konfigurasi saat ini belum menyediakan URL publik.
- Service worker aktif pada build production. Ia hanya menyimpan halaman offline generik; halaman admin, API, sesi, QRIS, dan mutasi tidak di-cache. Tidak ada antrean transaksi offline atau konfirmasi otomatis.
- Jika koneksi putus saat menyimpan, cek riwayat transaksi setelah tersambung sebelum membuat ulang pesanan.

Verifikasi deployment: buka `/manifest.webmanifest`, pasang dari Chrome Android/Safari iPhone, uji login/logout dan buka ulang ikon. Putuskan internet lalu buka ulang admin untuk melihat halaman offline. Pengujian desktop dengan viewport HP tidak menggantikan pengujian instalasi pada perangkat fisik.

## Preorder dan role tim

Terapkan `supabase/migrations/202611130003_preorders.sql` setelah dua migrasi sebelumnya. Migrasi mempertahankan seluruh transaksi dan menambahkan perilaku preorder pada payload pesanan yang sama, bukan membuat pencatatan penjualan kedua.

- `/admin/preorder`: pelanggan, beberapa menu/jumlah, alamat, kontak opsional, jadwal antar WIB, catatan, filter tanggal/status/pembayaran.
- Status pengantaran: Pending → Disiapkan → Diantar → Selesai. Jadwal/status dapat diedit; Selesai memerlukan pembayaran lunas.
- Pembayaran: belum lunas → lunas melalui detail pembayaran. QRIS tetap membutuhkan verifikasi manual di aplikasi merchant. Admin dapat membatalkan transaksi lunas setelah pengembalian dana; histori dan laporan pembalik dipertahankan, bukan menghapus pembayaran lama.
- Pesanan dibuat sekali dengan snapshot harga/HPP. Omzet tercatat saat pembayaran dikonfirmasi; mengubah jadwal/status antar tidak menambah omzet.
- Item yang sudah tersimpan tidak diedit; batalkan lalu buat ulang untuk mengganti menu. Perubahan jadwal bersamaan ditolak melalui nomor versi agar tidak menimpa pekerjaan tim lain.
- Kasir: dashboard operasional, seluruh preorder tim, dan POS. Tidak dapat membuka halaman transaksi umum, produk, laporan laba/HPP, pengeluaran, konten, pengaturan atau akun tim. API/SQL tetap memeriksa role aktif.
- Admin: seluruh menu; buat/nonaktifkan akun kasir melalui Pengaturan → Akun tim. Role ditentukan profil terlindungi di database, bukan pola nama email.
- Kasir dapat menangani dan menerima pembayaran preorder yang dibuat tim lain. Transaksi POS biasa tetap dibatasi pada miliknya; dashboard kasir tidak menampilkan HPP atau laba.

Pengujian database mencakup preorder lintas kasir, tanggal tidak valid, retry create/pay, konflik versi, larangan menyelesaikan yang belum lunas, snapshot HPP, refund khusus admin, serta akun nonaktif. Data pengujian hanya berada di database lokal sementara.
