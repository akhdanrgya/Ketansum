# HPP Ketansum

Dikonfirmasi pemilik pada 10 November 2026. Rupiah bulat per porsi, termasuk kemasan.

| Produk                  | Harga jual |   HPP | Laba kotor per porsi |
| ----------------------- | ---------: | ----: | -------------------: |
| Ketan Susu              |      10000 |  5127 |                 4873 |
| Ketan Susu Keju         |      12000 |  6627 |                 5373 |
| Ketan Susu Choco Crunch |      15000 |  9527 |                 5473 |
| Ketan Susu Oreo         |      15000 |  9327 |                 5673 |
| Dimsum Original         |      12000 |  9000 |                 3000 |
| Dimsum Chilli Oil       |      15000 | 10500 |                 4500 |

Sumber ketan: `KWU perhitungan HPP.xlsx`, Sheet1 H4:K8, sesuai konfirmasi pemilik. Dasar ketan Rp4.256 + kemasan/sendok Rp871 = Rp5.127. Varian Matcha di workbook belum diaktifkan karena tidak termasuk enam menu yang disepakati.

Sumber dimsum: konfirmasi pemilik, bahan Rp8.000 + kemasan Rp1.000; chilli oil tambahan Rp1.500. Bagian bahan saus Sheet1 B21:G28 tidak ditambahkan lagi tanpa konfirmasi untuk menghindari penghitungan ganda.

Laba kotor = harga jual − HPP. Laba operasional pada laporan juga mengurangi biaya operasional dan memperhitungkan pembatalan. Perubahan HPP produk berlaku untuk pesanan baru; snapshot pesanan lama tetap.

Jalankan `npm run seed:business` untuk menerapkan angka ini dan QRIS asli pada project di `.env.local`. Script ini menimpa harga/HPP enam menu dengan nilai di atas; jangan dijalankan ulang setelah perubahan harga tanpa memeriksa nilainya.
