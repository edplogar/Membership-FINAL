# Panduan Deploy ke Hostinger — Lombok Garden Hotel CRM

Panduan ini menjelaskan cara melakukan deployment aplikasi **Lombok Garden Hotel Membership & CRM System** ke hosting Hostinger (baik **Hostinger Shared/Static Hosting** maupun **Hostinger VPS Node.js Hosting**).

---

## Opsi 1: Deploy sebagai Static Web Hosting (Rekomendasi untuk Shared Hosting)
Karena aplikasi ini dibangun dengan React (Vite) dan dapat dijalankan sepenuhnya di sisi client dengan penyimpanan lokal (LocalStorage / Firebase), Anda dapat mengexportnya menjadi file statis (`dist/`) dan mengunggahnya ke Hostinger.

### Langkah 1: Build Aplikasi di Komputer Anda
1. Buka terminal pada folder project.
2. Jalankan perintah build:
   ```bash
   npm run build
   ```
3. Folder `dist/` akan otomatis tergenerate berisi file HTML, CSS, dan JavaScript production-ready.

### Langkah 2: Unggah ke Hostinger File Manager
1. Login ke panel **Hostinger hPanel**.
2. Masuk ke **File Manager** -> pilih domain Anda (misal `public_html`).
3. Upload seluruh isi file yang ada di dalam folder `dist/` (bukan foldernya, melainkan isinya seperti `index.html`, `assets/`, dll.) ke dalam direktori `public_html`.

### Langkah 3: Konfigurasi `.htaccess` untuk React Router (Penting!)
Agar routing halaman SPA (seperti `/member`, `/admin`, `/login`) tidak mengembalikan error 404 saat direfresh di Hostinger:
1. Buat file bernama `.htaccess` di dalam folder `public_html` Hostinger.
2. Masukkan kode berikut:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

---

## Opsi 2: Deploy ke Hostinger VPS / Cloud (Node.js Express Server)
Jika Anda menggunakan **Hostinger VPS** (Ubuntu / Almalinux dengan Node.js terinstall) dan ingin menjalankan Express API backend (`server.ts` untuk webhook, simulasi email, dll.):

### Langkah 1: Persiapan Server VPS
1. Hubungkan ke VPS via SSH.
2. Pastikan **Node.js** (versi 18+) dan **npm** / **bun** terinstall.
3. Install **PM2** untuk process manager:
   ```bash
   npm install -g pm2
   ```

### Langkah 2: Upload Project ke VPS
1. Clone atau upload seluruh folder project ke VPS (misal `/var/www/lombok-garden-crm`).
2. Buat file `.env` di root folder project sesuai dengan konfigurasi production Anda (misal kredensial Firebase atau API Key).

### Langkah 3: Build & Start dengan PM2
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build aplikasi production:
   ```bash
   npm run build
   ```
3. Jalankan server dengan PM2:
   ```bash
   pm2 start server.ts --name "lombok-crm" --interpreter tsx
   ```
   Atau jika menggunakan build output:
   ```bash
   pm2 start npm --name "lombok-crm" -- start
   ```
4. Konfigurasikan Nginx reverse proxy jika diperlukan untuk mengarah ke port 3000.

---

## Variabel Lingkungan (.env)
Jika menggunakan integrasi Firebase atau API eksternal, pastikan file `.env` diatur dengan benar di server atau pada build environment Anda.
