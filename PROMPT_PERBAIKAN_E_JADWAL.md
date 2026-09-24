# Prompt Perbaikan E-Jadwal Kebidanan

## Cara menggunakan

Simpan file ini di folder proyek yang dibuka di Antigravity IDE, lalu minta agen:

> Baca PROMPT_PERBAIKAN_E_JADWAL.md dan implementasikan instruksinya secara bertahap. Mulai dengan audit kode, lanjutkan perbaikan, lalu verifikasi hasilnya. Jangan deploy otomatis.

---

## Instruksi untuk agen

Bertindak sebagai senior frontend engineer dan product designer. Audit dan perbaiki proyek “Jadwal Ruang Zoom • S1 Kebidanan” yang sedang terbuka di workspace.

Referensi aplikasi: https://e-jadwalkebidanan.netlify.app/

Tujuan: membuat aplikasi jadwal akademik yang profesional, elegan, mudah dibaca, responsif, dan akurat dalam menampilkan status jadwal.

## 1. Cara kerja

- Baca struktur proyek, instruksi repository, dependensi, dan implementasi yang ada sebelum mengedit.
- Identifikasi framework, sumber data, integrasi Supabase, autentikasi admin, serta logika waktu dan filter.
- Buat rencana singkat, lalu lanjutkan implementasi dan verifikasi.
- Gunakan stack dan pola proyek yang sudah ada. Tambahkan dependensi hanya jika diperlukan.
- Pertahankan fitur yang berfungsi, termasuk login admin, pengelolaan jadwal, sinkronisasi, cetak, salin tautan Zoom, filter, Agenda/Matriks, dan tema jika tersedia.
- Jangan menghapus atau menimpa data nyata. Gunakan data contoh hanya untuk pengujian lokal.
- Periksa perubahan lokal pengguna dan hindari menimpanya.
- Jangan deploy otomatis. Siapkan hasil yang bisa ditinjau secara lokal.

## 2. Arah desain

Gunakan gaya dashboard akademik minimalis: hierarki jelas, warna tenang, komponen konsisten, dan kepadatan informasi yang nyaman.

Kurangi kartu bertumpuk, badge berlebihan, border putus-putus, teks terlalu kecil, bayangan besar, dan ruang kosong yang tidak membantu pembacaan.

Pertahankan logo dan identitas institusi. Jangan menambah sidebar jika navigasi belum memerlukannya.

Gunakan design tokens terpusat. Palet awal berikut boleh disesuaikan dengan identitas resmi yang tersedia:

| Token | Nilai awal |
| --- | --- |
| Primary | `#17324D` |
| Background | `#F6F8FA` |
| Surface | `#FFFFFF` |
| Text utama | `#182230` |
| Text sekunder | `#526070` |
| Border | `#E2E7ED` |

Gunakan warna semantik untuk tersedia, peringatan, dan error, selalu disertai label.

Pedoman:

- Satu keluarga font yang mudah dibaca.
- Judul halaman 24–28 px.
- Judul bagian 18–20 px.
- Isi utama 14–16 px.
- Teks pendukung 12–14 px.
- Radius panel 12 px; tombol dan input 8 px.
- Spacing konsisten dengan kelipatan 4 atau 8 px.
- Tinggi kontrol 40–44 px; target sentuh ponsel minimal sekitar 44 px.
- Kontras teks normal minimal 4,5:1.
- Animasi singkat dan mendukung `prefers-reduced-motion`.

## 3. Perbaikan susunan halaman

### Header

- Logo, nama aplikasi, dan identitas institusi di kiri.
- Login admin dan kontrol tambahan di kanan.
- Kurangi badge identitas yang berulang.
- Hilangkan detik pada jam.
- Tempatkan tombol Cetak dekat area jadwal.

### Judul halaman

- Jadikan “Jadwal Perkuliahan” judul utama.
- Tampilkan tanggal atau konteks akademik yang tersedia dari data.
- Jangan mengarang semester atau periode akademik.

### Panel status Zoom

- Buat ringkas dan seimbang.
- Tampilkan status saat ini, keterangan pendek, dan sesi berikutnya jika tersedia.
- Jadikan “Buka Zoom” aksi utama.
- Meeting ID, passcode, dan salin tautan menjadi informasi/aksi sekunder.
- Tombol salin harus tampak aktif dan memberi notifikasi berhasil atau gagal.
- Hindari beberapa kalimat yang mengulang status sama.

### Toolbar jadwal

- Kelompokkan pencarian, filter angkatan, Reset, dan pengalih Agenda/Matriks.
- Pada Agenda, utamakan tab hari agar tidak ada dua kontrol hari yang membingungkan.
- Pertahankan pilihan filter saat berpindah tampilan.
- Bedakan secara visual “hari dipilih” dan “hari ini”.

### Agenda

- Buat slot kosong sebagai baris ringkas dengan waktu dan keterangan.
- Untuk kelas terisi, prioritaskan waktu, nama mata kuliah, dosen, angkatan, dan status.
- Nama mata kuliah menjadi teks paling menonjol.
- Hindari huruf kapital kecil dan teks miring pucat untuk status kosong.

### Matriks

- Gunakan tabel dengan garis pembatas halus.
- Hilangkan kartu dan border putus-putus di setiap sel kosong.
- Gunakan tanda “—” dengan penjelasan singkat untuk sel tanpa jadwal.
- Gunakan kartu hanya untuk sesi berisi data.
- Sorot kolom hari ini secara lembut.
- Pastikan nama mata kuliah panjang tetap terbaca.
- Gunakan header/kolom waktu yang tetap terlihat saat menggulir jika sesuai.

### Ponsel

- Default ke Agenda pada kunjungan awal; hormati pilihan pengguna setelah diubah.
- Susun panel status dan aksi Zoom secara vertikal.
- Pencarian mudah dijangkau dan cukup lebar.
- Tab hari dapat digeser tanpa terpotong secara membingungkan.
- Matriks boleh memiliki scroll horizontal di dalam kontainernya.
- Hindari overflow horizontal seluruh halaman.

## 4. Perbaiki masalah sistem berikut

Temuan ini berasal dari pemeriksaan halaman publik pada 24 September 2026. Verifikasi kondisi terkini dan penyebabnya di kode sebelum memperbaiki. Pemeriksaan dilakukan ketika aplikasi menampilkan 0 sesi; ketepatan filter pada jadwal terisi dan alur admin belum diverifikasi.

### A. Status LIVE pada slot kosong

Slot tanpa kelas menampilkan “LIVE” di Agenda dan “Sesi Sedang Berjalan” di Matriks.

Pisahkan:

- Slot saat ini: hanya menunjukkan rentang waktu sekarang.
- Kelas terjadwal saat ini: terdapat jadwal yang cocok dengan waktu.
- Zoom benar-benar aktif: hanya boleh diklaim jika ada integrasi yang memverifikasinya.

Jangan menyatakan ada perkuliahan berlangsung hanya berdasarkan jam. Gunakan satu sumber logika status yang konsisten untuk panel atas, Agenda, dan Matriks.

### B. Data belum dimuat dianggap kosong

Saat “Menghubungkan…” masih tampil, halaman sudah menyatakan ruang tersedia dan 0 sesi.

Bedakan state:

- Loading.
- Berhasil dengan data.
- Berhasil tanpa data.
- Error.
- Data lama dengan pembaruan gagal, jika cache tersedia.

Jangan menyimpulkan ruang tersedia sebelum pengambilan data berhasil. Ketika gagal, tampilkan pesan dan tombol coba lagi.

### C. Pencarian kosong dianggap ruang tersedia

Pencarian yang tidak cocok tetap menampilkan “Ruang Zoom Kosong / Tersedia”.

Pisahkan ketersediaan ruang dari hasil filter:

- Status ruang menggunakan jadwal relevan secara keseluruhan.
- Daftar hasil menggunakan filter pengguna.
- Hasil filter kosong menampilkan “Tidak ada jadwal yang cocok” dan Reset.
- Jangan menyimpulkan ruang tersedia karena kelas tersembunyi oleh filter.

### D. Slot bertumpang tindih

Slot 4 tercantum 16.00–17.40, sedangkan slot 5 17.00–18.40.

- Periksa sumber konfigurasi dan aturan bisnis.
- Jangan mengubah jam secara sepihak jika waktu yang benar tidak tersedia.
- Laporkan konflik konkret dan minta keputusan hanya jika diperlukan. Lanjutkan pekerjaan lain yang tidak bergantung pada keputusan tersebut.
- Tambahkan validasi bentrok untuk ruang dan periode yang sama pada tambah/edit jadwal.
- Kecualikan record yang sedang diedit dari pemeriksaan dirinya sendiri.
- Jadwal yang berakhir tepat ketika jadwal berikutnya mulai tidak dianggap bentrok.

### E. Waktu dan sinkronisasi

- Gunakan zona waktu `Asia/Jakarta` secara konsisten untuk konteks WIB.
- Gunakan batas interval mulai inklusif dan selesai eksklusif.
- Periksa pergantian hari dan batas mulai/selesai kelas.
- Ganti istilah teknis “Cloud Sync” dengan bahasa pengguna.
- Waktu “Terakhir diperbarui” harus berasal dari pembacaan data yang berhasil.
- Jika pembaruan gagal, jelaskan bahwa data yang terlihat mungkin belum terbaru.

## 5. Kualitas implementasi

- Gunakan komponen bersama untuk tombol, input, badge status, tab hari, baris jadwal, loading, error, dan empty state.
- Hindari duplikasi fungsi filter dan penentuan status.
- Pastikan fokus keyboard terlihat, input berlabel, dan tombol ikon memiliki accessible name.
- Gunakan HTML semantik, termasuk header tabel yang benar.
- Pastikan tema gelap tetap terbaca jika fitur itu tersedia.
- Rapikan hasil cetak agar hanya memuat informasi jadwal yang relevan.
- Tinjau proteksi operasi tulis admin sesuai arsitektur yang ada. Jangan menaruh service-role key atau rahasia di frontend.
- Jangan menganggap tombol admin yang disembunyikan sebagai pengamanan akses.

## 6. Pengujian dan kriteria penerimaan

Jalankan build, lint, dan pengujian relevan yang tersedia. Tambahkan tes terarah untuk logika status, filter, dan konflik jadwal.

- [ ] Loading tidak menampilkan kesimpulan palsu bahwa ruang kosong.
- [ ] Error data berbeda dari jadwal kosong.
- [ ] Slot kosong tidak ditandai sebagai kelas berlangsung.
- [ ] Filter tidak mengubah kebenaran status ruang.
- [ ] Pencarian tanpa hasil menampilkan pesan yang tepat.
- [ ] Reset mengembalikan filter secara konsisten.
- [ ] Pergantian Agenda/Matriks mempertahankan filter.
- [ ] Batas waktu kelas dan zona waktu WIB benar.
- [ ] Konflik jadwal terdeteksi dengan benar.
- [ ] Salin tautan bekerja dan memberi umpan balik.
- [ ] Tampilan diperiksa pada lebar 360, 390, 768, 1024, dan 1440 px.
- [ ] Nama mata kuliah panjang, beberapa kelas, jadwal kosong, loading, dan error ditampilkan dengan rapi.
- [ ] Tidak ada overflow halaman, teks terpotong, atau kontrol bertabrakan.
- [ ] Alur admin yang tersedia tetap berfungsi.

Gunakan fixture lokal untuk keadaan yang tidak tersedia pada data nyata. Jangan mengisi database produksi untuk pengujian. Laporkan pemeriksaan yang tidak dapat dijalankan beserta alasannya.

## 7. Hasil akhir

Setelah implementasi, berikan:

- Ringkasan perubahan UI dan sistem.
- File utama yang diubah.
- Hasil build dan pengujian yang benar-benar dijalankan.
- Screenshot desktop dan ponsel jika kemampuan lingkungan mendukung.
- Masalah yang masih tersisa atau keputusan yang memerlukan informasi tambahan.

Kerjakan secara bertahap sampai hasil dapat ditinjau. Jangan berhenti setelah memberikan rencana atau rekomendasi.
