# Rayleigh_Bots

<p align="center">
  <img src="image/menu.png" alt="Bot Menu Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Hosting-Vercel%20%7C%20Cloudflare%20%7C%20Google%20Cloud-blue?style=for-the-badge&logo=vercel&logoColor=white" alt="Hosting Banner">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-ESM-green?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-Backend-black?style=flat-square&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status">
</p>

Repository resmi untuk sistem dan manajemen bot otomatis berbasis Node.js/ESM yang terintegrasi dengan berbagai fitur canggih seperti TempMail (akunlama.com), otomatisasi Alight Motion Premium, serta tools AI.

## 🚀 Fitur Utama
* **TempMail Integrator (`akunlama.com`)**: Pembuatan email sementara otomatis, pengecekan inbox, hingga pembacaan detail pesan masuk secara real-time.
* **Alight Motion Auto Activation (`ampremv2`)**: Otomatisasi pengiriman Magic Link, penangkapan OTP/link verifikasi, hingga aktivasi akun premium berdurasi 1 tahun.
* **AI Tools**: Fitur pemrosesan gambar dan kecerdasan buatan berbasis integrasi API pihak ketiga.
* **Backup System**: Fitur pencadangan direktori proyek otomatis dalam bentuk arsip `.zip` dengan indikator progres interaktif.

## 📂 Struktur Direktori Proyek
Rayleigh_Bots/
├── database/           # Penyimpanan data lokal bot
├── image/              # Kumpulan aset gambar dan banner
├── plugins/            # Modul perintah (commands) bot WhatsApp
├── system/             # Core engine, konfigurasi, dan helper script
├── .env_example        # Contoh konfigurasi environment
├── config.js           # Konfigurasi utama bot
├── index.js            # Titik masuk utama aplikasi (Entry point)
└── package.json        # Daftar dependensi modul Node.js

## 🛠️ Instalasi & Menjalankan Lokal
1. Clone repository ini ke perangkatmu:
   git clone https://github.com/reyclouddev-ops/Rayleigh_Bots.git
   cd Rayleigh_Bots
2. Install semua modul dan dependensi yang dibutuhkan:
   npm install
3. Jalankan bot:
   npm start

## ⚙️ Variabel Lingkungan (`.env`)
Pastikan kamu mengatur variabel environment berikut jika diperlukan untuk integrasi API eksternal:
* `AM_KEY` : Kunci API Firebase Identity Toolkit
* `IDT`    : Endpoint Identity Toolkit
* `VFY`    : Endpoint Verifikasi Pembelian / Alight Creative

---
🔐 **Dibuat oleh:** ReyCode (ReyCloud)  
© 2026 Solusi Hosting Web Terbaik
