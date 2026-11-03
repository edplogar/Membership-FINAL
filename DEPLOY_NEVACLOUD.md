# Panduan Lengkap Deploy Lombok Garden Hotel CRM di NevaCloud VPS

Panduan resmi ini disusun untuk **Super Admin** agar dapat melakukan deployment sistem **Lombok Garden Hotel CRM** ke **VPS NevaCloud** (nevacloud.com) dengan cepat, stabil, aman, dan tanpa hambatan.

---

## 1. Spesifikasi Rekomendasi di NevaCloud
- **Layanan**: Cloud VPS KVM NevaCloud (Region: Jakarta / Indonesia)
- **Sistem Operasi**: Ubuntu 22.04 LTS atau 24.04 LTS (64-bit)
- **Paket Minimum**:
  - 1 vCPU
  - 2 GB RAM (Rekomendasi 2GB - 4GB untuk performa optimal PM2 cluster)
  - 20 GB SSD Storage
- **Port yang dibuka di Firewall NevaCloud**:
  - `22` (SSH)
  - `80` (HTTP Web)
  - `443` (HTTPS SSL)
  - `3000` (Node.js Port - opsional jika reverse proxy Nginx aktif)

---

## 2. Cara 1: Deploy Otomatis 1-Perintah (Sangat Direkomendasikan)

Setelah membuat VPS Ubuntu di dashboard NevaCloud:

1. **Login ke VPS melalui SSH (Terminal / PuTTY)**:
   ```bash
   ssh root@IP_VPS_NEVACLOUD_ANDA
   ```

2. **Clone atau Upload Source Code Project ke VPS**:
   ```bash
   # Masuk ke direktori web
   mkdir -p /var/www/lombok-garden-crm
   cd /var/www/lombok-garden-crm

   # Jika menggunakan git:
   # git clone <URL_REPO_ANDA> .
   ```

3. **Beri Izin Eksekusi & Jalankan Script Otomatis**:
   ```bash
   chmod +x deploy-nevacloud.sh
   ./deploy-nevacloud.sh member.lombokgardenhotel.com 3000 /var/www/lombok-garden-crm edp.logar@gmail.com
   ```

   Script ini akan otomatis melakukan:
   - Update paket Ubuntu & tools build
   - Install Node.js 20 LTS, NPM, PM2, dan TSX
   - Install dependencies (`npm install`) & build frontend production (`npm run build`)
   - Generate file `.env` production
   - Mengonfigurasi Nginx Reverse Proxy & Firewall UFW
   - Menjalankan server backend Express dengan PM2 auto-restart saat reboot

---

## 3. Cara 2: Deploy Menggunakan Docker Compose
Jika VPS NevaCloud Anda sudah terinstall Docker:

```bash
cd /var/www/lombok-garden-crm
docker compose up -d --build
```
Aplikasi akan langsung berjalan di background pada port `3000`.

---

## 4. Konfigurasi Domain & SSL HTTPS (Certbot Let's Encrypt Gratis)

1. **Setting DNS di Domain Registrar (cPanel / Cloudflare / NevaCloud DNS)**:
   - Buat record **A** atau **CNAME**:
     - Host: `member` (untuk `member.lombokgardenhotel.com`)
     - Target: `IP_PUBLIC_VPS_NEVACLOUD`

2. **Pasang Sertifikat SSL Gratis**:
   Jalankan perintah berikut di terminal VPS:
   ```bash
   sudo certbot --nginx -d member.lombokgardenhotel.com --non-interactive --agree-tos -m edp.logar@gmail.com
   ```
   Certbot akan otomatis memperbarui konfigurasi Nginx menjadi HTTPS (Port 443) dengan auto-renewal.

---

## 5. Perintah Pemeliharaan Rutin untuk Super Admin

| Kebutuhan | Perintah Terminal VPS |
| :--- | :--- |
| **Cek Status Aplikasi** | `pm2 status` |
| **Melihat Log Real-time** | `pm2 logs lombok-crm` |
| **Restart Aplikasi** | `pm2 restart lombok-crm` |
| **Update / Rebuild Aplikasi** | `git pull && npm install && npm run build && pm2 restart lombok-crm` |
| **Cek Status Nginx** | `sudo systemctl status nginx` |
| **Reload Konfigurasi Nginx** | `sudo nginx -t && sudo systemctl reload nginx` |
| **Cek Penggunaan RAM / CPU** | `htop` atau `pm2 monit` |

---

## 6. Fitur Bantuan Khusus Super Admin di Dalam Aplikasi
Di dalam menu **Control Center** -> **Pusat Deploy VPS NevaCloud**:
- Status deteksi environment server (Node.js version, Memory usage, Uptime, PID).
- Tombol generator dan copy konfigurasi `deploy-nevacloud.sh`, `nginx.conf`, dan `ecosystem.config.cjs`.
- Uji koneksi live database Firestore & API webhook gateway WhatsApp ping.co.id.
- Tombol download paket deployment lengkap.
