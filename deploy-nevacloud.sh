#!/usr/bin/env bash
# ==============================================================================
# Lombok Garden Hotel — Auto Deployment Script for NevaCloud VPS (Ubuntu / Debian)
# Properti: Lombok Garden Hotel (Mataram, Lombok, NTB)
# ==============================================================================
set -e

# Warna output terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="${1:-member.lombokgardenhotel.com}"
PORT="${2:-3000}"
APP_DIR="${3:-/var/www/lombok-garden-crm}"
ADMIN_EMAIL="${4:-edp.logar@gmail.com}"

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}   LOMBOK GARDEN HOTEL — SETUP & DEPLOYMENT OTOMATIS NEVACLOUD VPS            ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "Target Domain : ${YELLOW}${DOMAIN}${NC}"
echo -e "Port Aplikasi : ${YELLOW}${PORT}${NC}"
echo -e "Direktori App : ${YELLOW}${APP_DIR}${NC}"
echo -e "Admin Email   : ${YELLOW}${ADMIN_EMAIL}${NC}"
echo "------------------------------------------------------------------------------"

# 1. Update OS Package & install prerequisite tools
echo -e "${BLUE}▶ [1/6] Memperbarui sistem OS & menginstall dependensi dasar...${NC}"
sudo apt update -y
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw software-properties-common

# 2. Install Node.js 20 LTS jika belum ada
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}▶ [2/6] Menginstall Node.js 20 LTS & NPM...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${GREEN}✓ Node.js sudah terpasang: $(node -v)${NC}"
fi

# Install PM2 dan TSX secara global
echo -e "${BLUE}▶ Menginstall PM2 Process Manager & TSX global...${NC}"
sudo npm install -g pm2 tsx

# 3. Setup Direktori Project
echo -e "${BLUE}▶ [3/6] Mempersiapkan folder aplikasi di ${APP_DIR}...${NC}"
sudo mkdir -p "${APP_DIR}"
sudo chown -R $USER:$USER "${APP_DIR}"

if [ "$PWD" != "$APP_DIR" ]; then
    echo -e "Menyalin file dari direktori saat ini ke ${APP_DIR}..."
    cp -ru . "${APP_DIR}/" || true
    cd "${APP_DIR}"
fi

# 4. Install npm dependencies & Build frontend
echo -e "${BLUE}▶ [4/6] Menginstall dependensi npm & build aset production...${NC}"
npm install --legacy-peer-deps

echo -e "Membangun frontend Vite ke folder dist/..."
npm run build

# Buat file .env jika belum ada
if [ ! -f .env ]; then
    echo -e "Membuat file konfigurasi environment .env..."
    cat <<EOF > .env
NODE_ENV=production
PORT=${PORT}
BASE_URL=https://${DOMAIN}
FIREBASE_DATABASE_ID=ai-studio-lombokgardenhote-6c919a5f-b175-40b5-b5a7-13f33d1558ca
SMTP_SENDER_EMAIL=membership@lombokgardenhotel.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${ADMIN_EMAIL}
PING_API_KEY=ping_live_8912734190abcdef88912
PING_API_URL=https://ping.co.id/api/v1
EOF
fi

# 5. Konfigurasi Nginx Reverse Proxy
echo -e "${BLUE}▶ [5/6] Mengonfigurasi Nginx Reverse Proxy & Firewall...${NC}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

sudo tee "${NGINX_CONF}" > /dev/null <<EOF
# Konfigurasi Nginx untuk Lombok Garden Hotel di NevaCloud VPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90;
        client_max_body_size 30M;
    }
}
EOF

sudo ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Atur UFW Firewall
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

# 6. Menjalankan Server dengan PM2
echo -e "${BLUE}▶ [6/6] Menjalankan server aplikasi dengan PM2...${NC}"
pm2 delete lombok-crm 2>/dev/null || true
pm2 start server.ts --name "lombok-crm" --interpreter tsx --env production
pm2 startup | tail -n 1 | sudo bash || true
pm2 save

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT SUKSES! Aplikasi Lombok Garden Hotel telah aktif di NevaCloud VPS!${NC}"
echo -e "Website URL   : ${YELLOW}http://${DOMAIN}${NC} (atau gunakan IP Public VPS)"
echo -e "Status PM2    : Jalankan 'pm2 status' atau 'pm2 logs lombok-crm'"
echo -e "------------------------------------------------------------------------------"
echo -e "${YELLOW}Langkah Lanjutan: Aktifkan SSL HTTPS Gratis (Let's Encrypt Certbot):${NC}"
echo -e "  sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${ADMIN_EMAIL}"
echo -e "${GREEN}==============================================================================${NC}"
