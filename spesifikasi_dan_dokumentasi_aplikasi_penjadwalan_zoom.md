# 📅 Zoom Room Scheduler (Single Account)

Sistem penjadwalan terpadu berbasis web untuk memantau, mengelola, dan mendistribusikan penggunaan 1 akun Zoom secara *real-time* antar-angkatan tanpa risiko bentrok (*collision-free*).

---

## 🎯 Ringkasan Kebutuhan & Problem Statement
* **Kondisi Sumber Daya:** Hanya tersedia **1 akun / 1 Meeting ID Zoom** bersama.
* **Tantangan:** Jika dua angkatan/kelas masuk di waktu yang sama, salah satu sesi akan terputus (*kicked/host collision*).
* **Fokus Data:** Informasi utama yang dikontrol adalah **Hari**, **Slot Waktu Baku**, dan **Angkatan** yang sedang menggunakan link Zoom.
* **Target Pengguna:** 
  1. **Mahasiswa:** Cek ketersediaan room secara *live*, salin meeting ID/passcode, dan join langsung.
  2. **PJ Angkatan / Admin:** Reservasi slot, edit PIC/dosen pengajar, dan batalkan pemakaian dengan otentikasi PIN.

---

## 🏗️ Arsitektur & Spesifikasi Teknis

### 1. Struktur Data

#### Model Data Slot Waktu (Time Slot)
```json
[
  { "label": "08.00 - 09.40", "startH": 8, "startM": 0, "endH": 9, "endM": 40 },
  { "label": "10.00 - 11.40", "startH": 10, "startM": 0, "endH": 11, "endM": 40 },
  { "label": "13.30 - 15.10", "startH": 13, "startM": 30, "endH": 15, "endM": 10 },
  { "label": "16.00 - 17.40", "startH": 16, "startM": 0, "endH": 17, "endM": 40 },
  { "label": "17.00 - 18.40", "startH": 17, "startM": 0, "endH": 18, "endM": 40 },
  { "label": "19.00 - 20.40", "startH": 19, "startM": 0, "endH": 20, "endM": 40 }
]
```

#### Model Data Reservasi (`Booking`)
```typescript
interface Booking {
  id: string;               // Unique ID: misal 'b-1729000000'
  day: string;              // 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu'
  timeSlot: string;         // '08.00 - 09.40'
  batch: string;            // '2022' | '2023' | '2024' | '2025' | '2026' | string
  pic?: string;             // Penanggung jawab / Dosen (opsional)
  note?: string;            // Mata kuliah / nama kegiatan (opsional)
  updatedAt: string;        // ISO timestamp
}
```

#### Model Data Zoom Room
```typescript
interface ZoomConfig {
  name: string;
  joinUrl: string;
  meetingId: string;
  passcode: string;
}
```

---

## ⚡ Fitur Utama yang Telah Diimplementasikan

1. **Header Real-Time Monitor & Deteksi Aktif (Live Tracker):**
   - Mendeteksi hari dan menit saat ini secara otomatis.
   - Mencocokkan dengan tabel jadwal: jika ada jadwal yang cocok, status banner langsung berubah menjadi **"LIVE: Sedang Digunakan oleh Angkatan X"** lengkap dengan **hitungan mundur sisa waktu**.
   - Tombol instan: *Copy Meeting ID*, *Copy Passcode*, *Copy Link*, dan *Buka Zoom*.

2. **Tampilan Matriks Spreadsheet (7 Hari x 6 Slot):**
   - Menampilkan slot Senin s/d Minggu sesuai susunan spreadsheet.
   - Menandai kolom **HARI INI** dan memberikan efek denyut (*pulse ring*) pada kotak yang sedang live.
   - Pembedaan visual warna per angkatan:
     - **2022:** Kuning / Amber
     - **2023:** Biru / Blue
     - **2024:** Ungu / Purple
     - **2025:** Hijau Emerald
     - **2026:** Merah Rose

3. **Mesin Pencegah Tabrakan Jadwal (*Anti-Collision Engine*):**
   - Memvalidasi kombinasi kunci unik `${day}_${timeSlot}`.
   - Menolak penambahan reservasi baru jika slot pada hari dan jam tersebut telah terisi.

4. **Multi-Role & Mode Pengelola Ber-PIN:**
   - **Mode Mahasiswa (Default):** Mode *read-only* yang bersih tanpa risiko salah hapus atau salah klik.
   - **Mode Pengelola:** Dilindungi PIN (default: `1234`) untuk menambah, mengubah, atau mengosongkan slot.

5. **Sinkronisasi Multi-Tab Real-Time:**
   - Memanfaatkan `BroadcastChannel('zoom_schedule_channel')` dan `StorageEvent`.
   - Perubahan data di satu layar otomatis memperbarui layar mahasiswa lain yang sedang terbuka tanpa perlu refresh manual.

---

## 🚀 Panduan Instalasi & Eksekusi di Antigravity / Node.js

Jika Anda ingin menjalankan atau mem-build project ini di workspace Antigravity menggunakan Vite / Next.js / React:

### 1. Inisialisasi Project (Vite + React)
```bash
npm create vite@latest zoom-scheduler -- --template react
cd zoom-scheduler
```

### 2. Pasang Dependensi UI & Ikon
```bash
npm install lucide-react clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3. Konfigurasi Tailwind CSS (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 4. Setup Entry CSS (`src/index.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 5. Salin Kode Aplikasi
Ganti isi file `src/App.jsx` dengan komponen aplikasi yang sudah dibuat di tab editor sebelah kanan.

### 6. Jalankan Server Dev
```bash
npm run dev
```

---

## 🔮 Roadmap Pengembangan Lanjutan di Antigravity

Beberapa fitur rekomendasi yang siap disambungkan ke backend:
- [ ] **Koneksi Database Cloud (Supabase / Firebase Firestore):** Menggantikan `localStorage` agar sinkronisasi berlaku lintas jaringan/seluruh internet secara permanen.
- [ ] **Webhook Zoom API:** Integrasi dengan API resmi Zoom untuk mendeteksi secara presisi kapan Host benar-benar klik *Start Meeting* dan *End Meeting*.
- [ ] **Notifikasi WhatsApp / Telegram Bot:** Mengirimkan pesan pengingat 15 menit sebelum slot suatu angkatan dimulai ke grup PJ angkatan.
- [ ] **Export & Print Jadwal:** Tombol cetak langsung ke format PDF atau sinkronisasi kembali ke file Google Sheets via Google Sheets API.