# PRD — Ketansum

**Produk:** Website portfolio usaha, admin panel, dan kasir Ketansum  
**Versi:** 1.0 — draft siap menjadi acuan implementasi  
**Tanggal:** 9 November 2026  
**Stack utama:** Next.js dan Supabase  
**Bahasa antarmuka:** Bahasa Indonesia  
**Mata uang / zona waktu:** Rupiah (IDR) / Asia/Jakarta

## 1. Ringkasan produk

Ketansum adalah usaha ketan susu dan dimsum untuk tugas kewirausahaan. Web app berfungsi sebagai portfolio usaha yang menarik sekaligus alat operasional untuk mencatat penjualan, menerima pembayaran tunai atau QRIS, dan melihat penghasilan serta laba rugi.

Website publik menggunakan gaya pop-art sesuai poster referensi pengguna: biru dominan, pola checkerboard, stiker komik, foto makanan, tipografi tebal, dan animasi yang ekspresif. Admin panel wajib tersedia dengan identitas visual yang sama, tetapi mengutamakan kecepatan kerja kasir dan keterbacaan data.

## 2. Tujuan dan ukuran keberhasilan

- Menampilkan identitas usaha, katalog, tim, dan dokumentasi kewirausahaan dalam satu website.
- Memungkinkan kasir menyelesaikan pencatatan transaksi sederhana dalam target maksimal 60 detik, di luar waktu pelanggan membayar.
- Menghitung omzet, HPP, dan laba dari transaksi serta pengeluaran yang tercatat.
- Menyediakan laporan yang dapat difilter dan diekspor untuk bahan tugas.
- Seluruh transaksi lunas memiliki nomor unik, item, nominal, metode pembayaran, waktu, dan petugas.
- Total pada dashboard, detail transaksi, dan ekspor harus konsisten untuk periode yang sama.

## 3. Pengguna dan hak akses

| Pengguna | Hak akses |
| --- | --- |
| Pengunjung | Melihat halaman publik, menu, harga, cerita usaha, dokumentasi, dan kontak |
| Kasir | Login, membuat transaksi, mengonfirmasi pembayaran, melihat transaksi yang dibuat sendiri, mencetak ulang struk miliknya |
| Admin / pemilik | Seluruh akses kasir, seluruh riwayat transaksi, produk, HPP, pengeluaran, laporan, konten, QRIS, akun kasir, serta pembatalan transaksi |

Tidak ada pendaftaran akun admin secara publik. Akun admin pertama disiapkan saat setup; akun kasir dibuat atau diundang admin. Pengunjung tidak dapat mengakses HPP, laba, data transaksi, atau data akun.

## 4. Ruang lingkup

### MVP — wajib tersedia

1. Website publik responsif dengan tema poster dan animasi.
2. Katalog ketan susu dan dimsum.
3. Portfolio kewirausahaan: cerita usaha, tim, proses, galeri, dan refleksi.
4. Login serta pembatasan akses admin dan kasir.
5. Admin panel dengan dashboard, kelola produk, kasir, transaksi, pengeluaran, dan laporan.
6. Pembayaran tunai dan QRIS menggunakan gambar yang diunggah admin.
7. Konfirmasi pembayaran QRIS manual oleh petugas.
8. Pencatatan HPP per porsi dan perhitungan laba rugi sederhana.
9. Ekspor laporan CSV dan struk yang dapat dicetak lewat browser.
10. Pengaturan identitas usaha, kontak, konten portfolio, dan QRIS.

### Di luar MVP

- Checkout mandiri pelanggan, akun pelanggan, pengiriman, dan integrasi kurir.
- QRIS dinamis, payment gateway, webhook, dan verifikasi pembayaran otomatis.
- Stok bahan baku, resep produksi, pembelian persediaan, dan akuntansi lengkap.
- Multi-cabang, loyalty point, promo kompleks, split payment, dan refund parsial.
- Mode kasir offline dan integrasi printer khusus.

Pemesanan publik pada MVP diarahkan ke kontak usaha. Transaksi resmi tetap dicatat melalui kasir.

## 5. Identitas visual

### Arah desain berdasarkan poster

- Nuansa: playful, ramai, youthful, retro pop-art, seperti poster jajanan yang hidup.
- Biru royal menjadi latar utama; merah, kuning, krem, pink, dan lavender sebagai aksen.
- Checkerboard merah-putih sebagai pembatas/header/footer; checkerboard oranye-krem atau pink-biru sebagai latar kartu tertentu.
- Ornamen berupa petir, bintang, mata kartun, gelembung komik, label bergerigi, dan tanda seru.
- Foto produk menjadi fokus utama, idealnya cutout dengan bayangan dan susunan sedikit miring.
- Heading tebal bergaya display; paragraf, harga detail, formulir, dan tabel memakai font yang mudah dibaca.
- Border hitam tebal dan offset shadow pada tombol serta kartu utama.
- Logo Ketansum menggunakan aset yang disediakan pengguna.

### Token warna awal

Warna berikut merupakan interpretasi awal poster, bukan hasil pengambilan warna presisi.

| Token | Nilai awal | Kegunaan |
| --- | --- | --- |
| Royal blue | `#07469B` | Latar dan identitas utama |
| Comic red | `#EF252A` | CTA dan checkerboard |
| Golden yellow | `#FFC533` | Harga, highlight, stiker |
| Cream | `#FFF2D2` | Panel dan label |
| Pink | `#FF91B5` | Aksen dekorasi |
| Lavender | `#C7B4E8` | Badge dan label harga |
| Ink | `#171717` | Teks, border, bayangan |

### Tata letak responsif

- Mobile-first; tidak ada horizontal overflow pada lebar 360 px.
- Menu berupa satu atau dua kolom sesuai ruang; desktop dapat menggunakan tiga kolom.
- Navigasi mobile ringkas dan tombol mudah disentuh, target minimal 44 × 44 px.
- Admin desktop memakai sidebar; mobile memakai drawer.
- Kasir desktop: katalog di kiri, keranjang di kanan. Mobile: keranjang sebagai panel yang bisa dibuka dengan tombol total tetap terlihat.

## 6. Sistem animasi

**Library yang direncanakan:** Motion untuk React, dibantu CSS untuk pola dekoratif sederhana. Pilih versi kompatibel saat implementasi dan hindari menumpuk library animasi tanpa kebutuhan.

| Area | Perilaku animasi |
| --- | --- |
| Hero | Judul muncul bertahap, foto produk pop-in, stiker bergerak ringan |
| Pergantian bagian | Reveal saat masuk viewport; stagger pada kartu |
| Kartu menu | Hover lift dan tilt ringan pada perangkat yang mendukung hover |
| Tombol | Feedback tekan berupa scale kecil dan perubahan shadow |
| Dekorasi | Floating pelan dan parallax ringan pada beberapa elemen |
| Filter menu | Perubahan layout dan fade antar kategori |
| Galeri | Reveal dan transisi modal foto |
| Admin | Transisi panel, modal, toast, skeleton, dan feedback aksi |
| Grafik | Animasi masuk singkat saat data pertama dimuat |
| Transaksi sukses | Checkmark atau burst singkat setelah server mengonfirmasi berhasil |

### Batasan wajib

- Full animasi berarti seluruh bagian memiliki motion yang terarah; tidak semua elemen bergerak terus-menerus.
- Interaksi utama sekitar 150–300 ms; entrance sekitar 400–700 ms sebagai target awal.
- Hormati `prefers-reduced-motion`; nonaktifkan parallax, floating, dan gerak besar pada mode tersebut.
- Animasi berulang lebih dari lima detik menyediakan kontrol jeda; dekorasi tidak boleh berkedip cepat.
- Gunakan transform dan opacity jika memungkinkan; kurangi jumlah dekorasi di mobile.
- Animasi tidak menunda klik, input kasir, pembacaan angka, atau konfirmasi pembayaran.
- Gambar QRIS selalu statis, tajam, tidak dimiringkan, tidak tertutup ornamen, dan mempertahankan ruang putih di sekelilingnya.

## 7. Halaman publik

### Beranda `/`

Urutan bagian:

1. Navbar: logo, Menu, Tentang, Portfolio, Kontak.
2. Hero dengan contoh headline “Ketan manis, dimsum gurih. Ketansum!” dan CTA “Lihat Menu”.
3. Produk unggulan dengan foto, harga, dan stiker kategori.
4. Katalog dengan filter Semua, Ketan Susu, dan Dimsum.
5. Cerita Ketansum dan tujuan tugas kewirausahaan.
6. Tim dan pembagian peran.
7. Dokumentasi produksi, penjualan, serta kegiatan usaha.
8. Pembelajaran atau refleksi usaha.
9. Kontak, CTA pesan melalui kontak usaha, dan footer.

Konten bisa berupa section satu halaman. Detail produk dapat dibuka melalui modal berisi foto, deskripsi, harga, dan status tersedia. Data laporan keuangan tidak ditampilkan ke publik secara otomatis.

### Data menu awal

Nama dan harga berikut dibaca dari poster pengguna dan dapat diubah admin sebelum peluncuran. Ukuran porsi, jumlah dimsum per kotak, komposisi, dan HPP belum ditentukan.

| Produk | Kategori | Harga awal |
| --- | --- | ---: |
| Ketan Susu | Ketan Susu | Rp10.000 |
| Ketan Susu Keju | Ketan Susu | Rp12.000 |
| Ketan Susu Choco Crunch | Ketan Susu | Rp15.000 |
| Ketan Susu Oreo | Ketan Susu | Rp15.000 |
| Dimsum Original | Dimsum | Rp12.000 |
| Dimsum Chilli Oil | Dimsum | Rp15.000 |

## 8. Admin panel

| Rute | Fungsi |
| --- | --- |
| `/login` | Login admin dan kasir |
| `/admin` | Ringkasan performa usaha |
| `/admin/kasir` | Katalog, keranjang, pembayaran, dan struk |
| `/admin/produk` | Produk, kategori, harga, HPP, foto, dan ketersediaan |
| `/admin/transaksi` | Daftar, filter, detail, dan pembatalan transaksi |
| `/admin/pengeluaran` | Pencatatan biaya operasional |
| `/admin/laporan` | Penjualan, penghasilan, HPP, dan laba rugi |
| `/admin/konten` | Cerita, tim, galeri, dan refleksi |
| `/admin/pengaturan` | Identitas, kontak, QRIS, dan akun kasir |

### Dashboard

- Kartu: omzet lunas, jumlah transaksi, porsi terjual, HPP, biaya operasional, dan laba bersih operasional.
- Grafik omzet dan laba per hari.
- Produk terlaris berdasarkan jumlah porsi serta omzet.
- Komposisi pembayaran tunai dan QRIS.
- Daftar transaksi terbaru dan transaksi menunggu pembayaran.
- Filter hari ini, tujuh hari, bulan ini, serta rentang tanggal khusus.
- Semua kartu dan grafik menggunakan filter waktu yang sama.
- Data kosong menampilkan ajakan memulai transaksi, tanpa data penjualan palsu.

### Kelola produk

- Tambah/edit nama, kategori, deskripsi, harga jual, HPP per porsi, foto, dan urutan tampil.
- Aktif/nonaktif serta toggle tersedia/habis.
- Harga dan HPP tidak boleh negatif; HPP yang belum diisi dibedakan dari HPP nol.
- Produk hanya dapat dijual jika harga dan HPP sudah diisi. HPP nol memerlukan konfirmasi admin.
- Produk yang sudah digunakan dalam transaksi diarsipkan, bukan dihapus permanen.
- Perubahan harga dan HPP tidak mengubah transaksi yang sudah tersimpan.

### Kasir / POS

1. Kasir mencari atau memilih produk yang tersedia.
2. Produk masuk keranjang; jumlah bisa ditambah, dikurangi, atau dihapus.
3. Sistem menampilkan subtotal dan total. MVP tidak memakai diskon atau pajak otomatis.
4. Nama pelanggan dan catatan boleh dikosongkan.
5. Kasir memilih tunai atau QRIS dan menyimpan transaksi pending.
6. Server menghitung ulang harga, memvalidasi produk, dan menyimpan snapshot harga serta HPP.
7. Setelah pembayaran terverifikasi, transaksi menjadi paid.
8. Sistem menampilkan struk, nomor transaksi, dan opsi transaksi baru.

Keranjang disimpan sementara dalam sesi browser agar tidak hilang saat navigasi ringan. Transaksi pending tersimpan di server dan dapat dibuka kembali. Jika koneksi gagal, tampilkan status gagal dan opsi coba lagi; jangan menampilkan sukses sebelum server menyimpan data.

### Pembayaran tunai

- Kasir memasukkan uang diterima.
- Uang diterima harus minimal sama dengan total.
- Kembalian = uang diterima − total.
- Pendapatan memakai total transaksi, bukan nominal uang yang diserahkan pelanggan.

### Pembayaran QRIS

- Admin mengunggah gambar QRIS dan mengisi nama merchant.
- Halaman pembayaran menampilkan gambar, nama merchant, nomor transaksi, dan total yang harus dibayar.
- Pelanggan memindai QR dan memasukkan nominal sesuai total bila diperlukan.
- Kasir memeriksa pembayaran pada aplikasi merchant, lalu menekan “Konfirmasi Pembayaran”.
- Catat petugas, waktu konfirmasi, dan referensi pembayaran opsional.
- Gambar QR statis tidak memberi notifikasi pembayaran ke aplikasi; memindai QR tidak otomatis melunasi transaksi.
- Jika gambar QR belum tersedia, opsi QRIS dinonaktifkan dengan pesan yang jelas. Jangan gunakan QR dummy untuk pembayaran nyata.
- Pembaruan QR oleh admin dicatat dalam audit log.

### Riwayat transaksi

- Cari nomor transaksi; filter tanggal, status, metode bayar, dan kasir sesuai hak akses.
- Detail menampilkan item, kuantitas, harga saat transaksi, total, petugas, dan informasi pembayaran.
- Struk menampilkan brand, nomor transaksi, waktu, item, total, metode pembayaran, serta uang diterima/kembalian untuk tunai.
- Transaksi lunas tidak diedit langsung. Koreksi melalui pembatalan admin dengan alasan, lalu transaksi pengganti bila diperlukan.
- Pembatalan transaksi lunas membutuhkan konfirmasi bahwa pengembalian dana sudah ditangani manual; aplikasi tidak mengirim uang.

### Pengeluaran

- Input tanggal, kategori, deskripsi, nominal, dan bukti opsional.
- Kategori awal: transportasi, promosi, sewa, administrasi, dan lain-lain.
- Biaya bahan dan kemasan per porsi masuk HPP. Jangan memasukkannya kembali sebagai biaya operasional untuk transaksi yang sama.
- Modal awal bukan pendapatan penjualan dan bukan biaya operasional.
- Semua perubahan pengeluaran tercatat dengan petugas dan waktu.

## 9. Aturan laporan dan laba rugi

Laporan MVP adalah laporan operasional sederhana berbasis penjualan terkonfirmasi dan HPP standar per porsi, bukan laporan akuntansi persediaan lengkap.

```text
Omzet = jumlah total transaksi yang telah dikonfirmasi lunas
HPP penjualan = jumlah (kuantitas terjual × snapshot HPP per porsi)
Laba kotor = omzet − HPP penjualan
Laba bersih operasional = laba kotor − pengeluaran operasional
Margin laba = laba bersih operasional / omzet × 100%
```

- Jika omzet nol, margin ditampilkan “—”, bukan pembagian dengan nol.
- HPP per porsi mencakup bahan, topping, kemasan, dan biaya produksi per porsi yang ditentukan admin.
- Pendapatan diakui berdasarkan `paid_at`; pengeluaran berdasarkan tanggal pengeluaran.
- Transaksi pending/cancelled tidak menambah omzet.
- Pembatalan transaksi paid membuat entri pembalik omzet dan HPP pada waktu pembatalan. Riwayat periode sebelumnya tetap dapat ditelusuri.
- Laporan memisahkan penjualan bruto, pembatalan/pengembalian, dan omzet bersih periode.
- Jumlah transaksi dan porsi menampilkan nilai bruto serta pembatalannya agar laporan tidak ambigu.
- HPP standar merupakan estimasi biaya. Barang rusak, sisa produksi, atau biaya lain yang belum tercatat dapat membuat laba berbeda dari hasil nyata.
- Semua nominal disimpan sebagai bilangan bulat rupiah; perhitungan final dilakukan di server/database.
- Waktu disimpan secara konsisten dan ditampilkan serta dikelompokkan dalam Asia/Jakarta.
- Ekspor CSV memuat rentang tanggal, penjualan, pembatalan, HPP, pengeluaran, serta laba; data mengikuti hak akses admin.

### Contoh penerimaan perhitungan

Data ilustrasi, bukan HPP asli Ketansum: dua Ketan Susu seharga Rp10.000 dengan HPP Rp6.000 per porsi menghasilkan omzet Rp20.000, HPP Rp12.000, dan laba kotor Rp8.000. Jika pengeluaran periode Rp3.000, laba bersih operasional Rp5.000. Pembayaran tunai Rp50.000 menghasilkan kembalian Rp30.000; omzet tetap Rp20.000.

## 10. Status dan integritas transaksi

| Status | Makna | Transisi yang diizinkan |
| --- | --- | --- |
| `pending` | Tersimpan, belum dibayar | `paid` atau `cancelled` |
| `paid` | Pembayaran dikonfirmasi | `voided`, hanya admin |
| `cancelled` | Dibatalkan sebelum lunas | Final |
| `voided` | Penjualan lunas dibalik oleh admin | Final |

- Nomor transaksi harus unik dan dibuat server.
- Penyimpanan order dan seluruh item harus atomik: seluruhnya berhasil atau tidak tersimpan.
- Gunakan idempotency key untuk pembuatan dan konfirmasi; klik ganda/retry tidak menghasilkan penjualan ganda.
- Konfirmasi ulang untuk transaksi paid tidak menambah omzet lagi.
- Perubahan status divalidasi server; pengguna tidak dapat melompati aturan melalui request langsung.
- Entri pembalik dibuat maksimal sekali per transaksi dan terhubung ke transaksi sumber.

## 11. Rancangan teknis

### Komponen

- **Next.js + TypeScript:** halaman publik, panel admin, routing, dan operasi server.
- **Supabase Auth:** login dan sesi admin/kasir.
- **Supabase PostgreSQL:** produk, transaksi, pengeluaran, konten, dan laporan.
- **Supabase Storage:** foto produk, galeri, logo, gambar QRIS, dan bukti biaya.
- **Tailwind CSS:** implementasi desain responsif dan token visual.
- **Motion untuk React:** animasi komponen dan interaksi.
- **Library chart:** grafik dashboard; pilihan final ditetapkan saat implementasi.

Versi dependency dipilih dan dikunci pada tahap implementasi. Dokumen ini menetapkan kebutuhan produk, bukan kontrak API library tertentu.

### Model data minimum

| Entitas | Field utama |
| --- | --- |
| `profiles` | user_id, name, role, active |
| `categories` | id, name, sort_order |
| `products` | id, category_id, name, description, price, cost_per_unit, image_path, active, available, sort_order |
| `orders` | id, number, cashier_id, customer_name, notes, status, payment_method, total, cash_received, change_amount, idempotency_key, created_at, paid_at, confirmed_by, payment_reference, voided_at, void_reason |
| `order_items` | id, order_id, product_id, name_snapshot, unit_price_snapshot, unit_cost_snapshot, quantity, line_total |
| `reversals` | id, order_id unik, revenue_amount, cost_amount, reason, created_by, created_at |
| `expenses` | id, date, category, description, amount, receipt_path, created_by, created_at, updated_at |
| `site_content` | id, section_key, content, published, updated_at |
| `gallery_items` | id, image_path, caption, sort_order, published |
| `business_settings` | business_name, logo_path, contact, social_links, qris_path, merchant_name |
| `audit_logs` | id, actor_id, action, entity_type, entity_id, changes, created_at |

### Akses dan keamanan

- Terapkan Row Level Security pada seluruh tabel yang diakses klien.
- Publik hanya membaca produk aktif dan konten terpublikasi serta pengaturan publik yang diizinkan; HPP tidak ikut respons publik.
- Kasir hanya mendapat akses operasional yang tercantum pada matriks peran; laporan laba dan pengeluaran khusus admin.
- Validasi role pada server/database, bukan hanya dengan menyembunyikan menu.
- Role tidak boleh diubah oleh pengguna sendiri.
- Kunci service-role tidak boleh berada di browser atau repository publik.
- Batasi upload berdasarkan tipe dan ukuran; bukti pengeluaran menggunakan akses privat.
- Audit log dibuat oleh operasi server tepercaya dan tidak dapat diedit kasir.
- Data sensitif tidak boleh masuk cache publik atau metadata SEO.

## 12. Persyaratan nonfungsional

- Mendukung mobile, tablet, dan desktop; alur kasir tetap dapat digunakan dengan keyboard.
- Form memiliki label, validasi, pesan kesalahan jelas, serta focus state yang terlihat.
- Teks utama dan kontrol memenuhi target kontras WCAG AA.
- Optimalkan foto, gunakan lazy loading di bawah fold, dan hindari video autoplay berat.
- Target LCP halaman publik ≤2,5 detik dan CLS ≤0,1 pada kondisi pengujian yang disepakati; verifikasi di perangkat mobile sebelum rilis.
- Loading, empty, error, unauthorized, dan success state wajib tersedia.
- Permintaan gagal dapat dicoba ulang tanpa duplikasi transaksi.
- Halaman admin tidak diindeks mesin pencari.
- Data demo dipisahkan dari data penjualan nyata dan diberi label jelas.

## 13. Acceptance criteria

- [ ] Beranda sesuai arah poster: biru, checkerboard, stiker, foto makanan, dan tipografi tebal.
- [ ] Enam menu awal tampil dengan harga yang sesuai poster dan dapat diperbarui admin.
- [ ] Semua section publik memiliki animasi terarah; reduced motion dan kontrol jeda berfungsi.
- [ ] Admin panel lengkap dapat diakses setelah login dan seluruh rute terlindungi.
- [ ] Kasir tidak dapat mengakses HPP, laporan laba, pengeluaran, atau pengaturan melalui UI maupun request langsung.
- [ ] Transaksi tunai menghitung total/kembalian dengan benar dan menolak pembayaran kurang.
- [ ] QRIS menampilkan gambar asli yang diunggah; transaksi tetap pending sampai kasir mengonfirmasi.
- [ ] Klik konfirmasi dua kali dan retry saat koneksi terputus tidak menduplikasi transaksi atau omzet.
- [ ] Perubahan harga/HPP tidak mengubah nilai transaksi historis.
- [ ] Pembatalan paid hanya dilakukan admin, membutuhkan alasan, dan menghasilkan satu entri pembalik.
- [ ] Omzet, HPP, pengeluaran, dan laba sesuai contoh hitung serta konsisten pada dashboard dan CSV.
- [ ] Filter tanggal menggunakan Asia/Jakarta, termasuk transaksi dekat pergantian hari.
- [ ] Struk dapat dicetak dan laporan dapat diekspor.
- [ ] Halaman 360 px tidak overflow; kasir tetap nyaman di mobile dan desktop.
- [ ] Tidak ada data privat atau secret pada akses publik.

## 14. Tahap pengerjaan

1. **Fondasi:** setup Next.js/Supabase, skema, auth, role, RLS, dan design token.
2. **Website publik:** struktur landing page, katalog, portfolio, aset visual, dan animasi.
3. **Operasional:** CRUD produk, POS, tunai, QRIS manual, riwayat, dan struk.
4. **Keuangan:** HPP snapshot, pengeluaran, pembatalan, dashboard, filter, dan ekspor.
5. **Penyelesaian:** konten admin, pengaturan, pengujian akses, integritas transaksi, responsivitas, performa, dan deployment.

## 15. Aset dan keputusan yang masih dibutuhkan

Hal berikut tidak menghalangi pembuatan struktur aplikasi, tetapi perlu dilengkapi sebelum penggunaan nyata:

- Logo Ketansum serta foto produk terpisah beresolusi baik.
- Gambar QRIS asli dan nama merchant; disediakan pengguna kemudian.
- HPP per porsi setiap produk, termasuk kemasan dan topping.
- Konfirmasi harga akhir, ukuran porsi, dan jumlah dimsum per kotak.
- Cerita usaha, anggota tim, peran, foto kegiatan, serta refleksi tugas.
- Kontak resmi yang akan dipublikasikan; nomor pada poster tidak otomatis dianggap kontak final.
- Identitas akun admin pertama dan kasir.
- Hosting, domain, serta konfigurasi produksi Supabase.

**Asumsi MVP:** satu usaha, satu mata uang, penjualan dicatat petugas, QRIS diverifikasi manual, dan laba menggunakan HPP standar per porsi. Setiap perubahan asumsi perlu diperbarui pada PRD sebelum implementasi fitur terkait.
