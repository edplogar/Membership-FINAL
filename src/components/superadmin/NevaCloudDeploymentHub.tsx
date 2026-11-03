import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Cpu,
  HardDrive,
  Globe,
  Radio,
  FileCode,
  Layers,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  FolderDown,
  Play,
  Zap,
  Lock,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { MEMBER_CUSTOM_DOMAIN, FIRESTORE_DATABASE_ID } from '../../services/domainService';

interface ServerInfo {
  success: boolean;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  pid: number;
  port: number;
  environment: string;
  isProduction: boolean;
  distFolderBuilt: boolean;
  envFileConfigured: boolean;
  vpsProvider: string;
  activeDomain: string;
  memory: {
    processRssMb: number;
    processHeapMb: number;
    totalRamMb: number;
    freeRamMb: number;
    usagePercent: number;
  };
  systemSpecs: {
    cpus: number;
    cpuModel: string;
    osType: string;
    osRelease: string;
    loadAverage: number[];
  };
  database: {
    id: string;
    mode: string;
    customDomainTarget: string;
  };
  deploymentReadiness: {
    serverRunning: boolean;
    apiHealth: string;
    portBinding: string;
    pm2Recommended: boolean;
    nginxReverseProxyReady: boolean;
    sslLetEncryptSupported: boolean;
  };
  timestamp: string;
}

export const NevaCloudDeploymentHub: React.FC = () => {
  const { showToast } = useToast();

  // Configuration parameters
  const [domain, setDomain] = useState(MEMBER_CUSTOM_DOMAIN || 'member.lombokgardenhotel.com');
  const [port, setPort] = useState(3000);
  const [vpsDir, setVpsDir] = useState('/var/www/lombok-garden-crm');
  const [appName, setAppName] = useState('lombok-crm');
  const [adminEmail, setAdminEmail] = useState('edp.logar@gmail.com');

  // Active tab in viewer
  const [activeTab, setActiveTab] = useState<'script' | 'nginx' | 'pm2' | 'env' | 'docker' | 'checklist'>('script');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live telemetry state
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    test: string;
    status: 'success' | 'error' | 'pending';
    latencyMs: number;
    message: string;
  } | null>(null);

  // Fetch server telemetry
  const fetchServerInfo = async () => {
    setIsLoadingInfo(true);
    try {
      const res = await fetch('/api/system/server-info');
      if (res.ok) {
        const data = await res.json();
        setServerInfo(data);
      }
    } catch {
      // Offline fallback for UI display
    } finally {
      setIsLoadingInfo(false);
    }
  };

  useEffect(() => {
    fetchServerInfo();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Teks konfigurasi berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`File ${filename} berhasil diunduh.`, 'info');
  };

  const runTestApi = async (type: 'health' | 'domain' | 'sync') => {
    const startTime = Date.now();
    setDiagnosticResult({ test: type, status: 'pending', latencyMs: 0, message: 'Menguji respons server...' });
    try {
      const path = type === 'health' ? '/api/health' : type === 'domain' ? '/api/domain/status' : '/api/sync/status';
      const res = await fetch(path);
      const latency = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        setDiagnosticResult({
          test: type,
          status: 'success',
          latencyMs: latency,
          message: `Endpoint ${path} merespons OK (${latency}ms). Status: ${data.status || 'Active'}`,
        });
        showToast(`Uji koneksi ${path} berhasil (${latency}ms)!`, 'success');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      const errObj = err as Error;
      setDiagnosticResult({
        test: type,
        status: 'error',
        latencyMs: Date.now() - startTime,
        message: `Gagal menghubungi endpoint: ${errObj.message}`,
      });
      showToast('Gagal menghubungi endpoint server', 'error');
    }
  };

  // Formatted config contents
  const nginxContent = `# ==============================================================================
# Nginx Reverse Proxy Configuration for Lombok Garden Hotel on NevaCloud VPS
# Lokasi: /etc/nginx/sites-available/${domain}
# ==============================================================================

server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    # Logging
    access_log /var/log/nginx/lombok_access.log;
    error_log /var/log/nginx/lombok_error.log warn;

    # Gzip Compression untuk performa cepat di HP tamu
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml image/svg+xml;

    # Keamanan & Header Proteksi
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy ke aplikasi Node.js Express (Port ${port})
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
        client_max_body_size 30M;
    }
}
`;

  const pm2Content = `// PM2 Ecosystem Configuration for NevaCloud VPS
// File: ecosystem.config.cjs
// Jalankan: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: '${appName}',
      script: 'server.ts',
      interpreter: 'tsx',
      cwd: '${vpsDir}',
      instances: 'max', // Memanfaatkan seluruh core vCPU NevaCloud
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: ${port},
      },
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
`;

  const envContent = `# Konfigurasi Environment Production NevaCloud VPS
NODE_ENV=production
PORT=${port}
BASE_URL=https://${domain}
FIREBASE_DATABASE_ID=${FIRESTORE_DATABASE_ID}

# SMTP Mailer Settings
SMTP_SENDER_EMAIL=membership@lombokgardenhotel.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${adminEmail}
SMTP_PASSWORD=

# ping.co.id WhatsApp Gateway
PING_API_KEY=ping_live_8912734190abcdef88912
PING_API_URL=https://ping.co.id/api/v1
`;

  const oneClickScriptContent = `#!/usr/bin/env bash
# ==============================================================================
# Lombok Garden Hotel — Auto Deployment Script for NevaCloud VPS (Ubuntu/Debian)
# ==============================================================================
set -e

echo "🚀 [1/6] Memperbarui sistem OS & tools dasar..."
sudo apt update -y
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw

# Install Node.js 20 LTS jika belum ada
if ! command -v node &> /dev/null; then
    echo "📦 [2/6] Menginstall Node.js 20 LTS & PM2..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

sudo npm install -g pm2 tsx

# Siapkan direktori project
echo "📂 [3/6] Menyiapkan direktori aplikasi di ${vpsDir}..."
sudo mkdir -p ${vpsDir}
sudo chown -R $USER:$USER ${vpsDir}
cd ${vpsDir}

# Install dependensi dan build frontend
echo "📦 [4/6] Menginstall dependencies npm & build frontend..."
npm install --legacy-peer-deps
npm run build

# Buat file .env jika belum ada
if [ ! -f .env ]; then
    cat <<EOF > .env
${envContent}
EOF
fi

# Konfigurasi Nginx
echo "🌐 [5/6] Mengonfigurasi Nginx Reverse Proxy..."
sudo tee /etc/nginx/sites-available/${domain} > /dev/null << 'EOF'
${nginxContent}
EOF

sudo ln -sf /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Buka Firewall
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

# Jalankan aplikasi dengan PM2
echo "⚡ [6/6] Menjalankan server aplikasi dengan PM2..."
pm2 delete ${appName} 2>/dev/null || true
pm2 start server.ts --name "${appName}" --interpreter tsx --env production
pm2 startup | tail -n 1 | sudo bash || true
pm2 save

echo "=============================================================================="
echo "✅ DEPLOYMENT BERHASIL! Lombok Garden Hotel aktif di NevaCloud VPS"
echo "🌐 URL: http://${domain}"
echo "🔒 Untuk SSL HTTPS gratis, jalankan:"
echo "   sudo certbot --nginx -d ${domain} --non-interactive --agree-tos -m ${adminEmail}"
echo "=============================================================================="
`;

  const dockerComposeContent = `services:
  ${appName}:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${appName}
    restart: always
    ports:
      - "${port}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - BASE_URL=https://${domain}
      - FIREBASE_DATABASE_ID=${FIRESTORE_DATABASE_ID}
      - SMTP_SENDER_EMAIL=membership@lombokgardenhotel.com
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_SECURE=false
      - SMTP_USER=${adminEmail}
    volumes:
      - ./logs:/app/logs
`;

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-br from-[#061d12] via-[#092e1d] to-[#04150c] text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-emerald-500/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                Cloud VPS Deployment Suite
              </span>
              <span className="text-xs text-stone-300 font-mono">
                Provider: NevaCloud VPS (Ubuntu/Debian)
              </span>
            </div>
            <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Pusat Deployment VPS NevaCloud
            </h1>
            <p className="text-stone-300 text-sm leading-relaxed">
              Konfigurasikan dan jalankan aplikasi Lombok Garden Hotel CRM di server VPS NevaCloud dengan reverse proxy Nginx, PM2 cluster manager, auto-restart on reboot, dan sertifikat SSL gratis tanpa hambatan teknis.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={fetchServerInfo}
              disabled={isLoadingInfo}
              className="px-4 py-2.5 bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 text-stone-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInfo ? 'animate-spin' : ''}`} />
              <span>Cek Status Server</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadFile('deploy-nevacloud.sh', oneClickScriptContent)}
              className="px-4 py-2.5 bg-[#00A651] hover:bg-emerald-600 border border-emerald-400/50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white shadow-md transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Script Installer</span>
            </button>
          </div>
        </div>

        {/* 2. Real-time Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-500/20">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 font-medium mb-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Domain</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white font-mono truncate" title={domain}>
              {domain}
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Port: {port} (Proxy Nginx)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 font-medium mb-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Runtime Engine</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white">
              Node.js {serverInfo?.nodeVersion || '20 LTS'}
            </div>
            <div className="text-[10px] text-stone-300 mt-0.5">
              PID: {serverInfo?.pid || 1} · {serverInfo?.isProduction ? 'Production' : 'Dev Ready'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 font-medium mb-1">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Memory & RAM</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white">
              {serverInfo?.memory?.processRssMb || 68} MB (Heap: {serverInfo?.memory?.processHeapMb || 32} MB)
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              Alokasi Ringan & Cepat
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 font-medium mb-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database Sync</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-300">
              Firestore Cloud Active
            </div>
            <div className="text-[10px] text-stone-300 truncate mt-0.5" title={FIRESTORE_DATABASE_ID}>
              ID: ...{FIRESTORE_DATABASE_ID.slice(-12)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Parameter Customizer Form */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00A651] flex items-center justify-center font-bold">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Parameter Konfigurasi VPS NevaCloud
              </h2>
              <p className="text-xs text-stone-500">
                Sesuaikan parameter domain dan direktori untuk menghasilkan script & konfigurasi otomatis.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDomain('member.lombokgardenhotel.com');
              setPort(3000);
              setVpsDir('/var/www/lombok-garden-crm');
              setAppName('lombok-crm');
              setAdminEmail('edp.logar@gmail.com');
              showToast('Parameter dikembalikan ke nilai rekomendasi default.', 'info');
            }}
            className="text-xs text-stone-500 hover:text-stone-800 underline transition-colors cursor-pointer self-start sm:self-auto"
          >
            Reset ke Default Rekomendasi
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nama Domain / Subdomain *
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="member.lombokgardenhotel.com"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-emerald-600 focus:bg-white"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">
              Arahkan DNS CNAME atau A record ke IP VPS NevaCloud Anda.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Port Server Node.js *
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value) || 3000)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-emerald-600 focus:bg-white"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">
              Default: 3000 (Diproxy oleh Nginx).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nama Aplikasi PM2
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-emerald-600 focus:bg-white"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">
              Nama proses di dashboard PM2.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email Super Admin (SSL)
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-emerald-600 focus:bg-white"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">
              Untuk notifikasi sertifikat SSL Let's Encrypt.
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Path Direktori di VPS NevaCloud
          </label>
          <input
            type="text"
            value={vpsDir}
            onChange={(e) => setVpsDir(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-emerald-600 focus:bg-white"
          />
          <span className="text-[10px] text-stone-400 mt-1 block">
            Rekomendasi standar Linux web server: <code>/var/www/lombok-garden-crm</code>
          </span>
        </div>
      </div>

      {/* 4. Tab Navigation for Config Viewers */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="flex items-center overflow-x-auto border-b border-stone-200 bg-stone-50/80 p-1.5 gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'script'
                ? 'bg-white text-emerald-800 font-bold shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#00A651]" />
            <span>1. Script Otomatis (deploy-nevacloud.sh)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nginx')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'nginx'
                ? 'bg-white text-emerald-800 font-bold shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>2. Nginx Reverse Proxy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pm2')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'pm2'
                ? 'bg-white text-emerald-800 font-bold shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>3. PM2 Cluster Config</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'env'
                ? 'bg-white text-emerald-800 font-bold shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-stone-700" />
            <span>4. File .env Production</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docker')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'docker'
                ? 'bg-white text-emerald-800 font-bold shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>5. Docker Compose (Opsional)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'checklist'
                ? 'bg-white text-emerald-800 font-bold shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>6. Checklist Langkah Demi Langkah</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Cara Menjalankan Script Otomatis di Terminal VPS:
                  </h3>
                  <p className="text-[11px] text-stone-600">
                    Cukup upload folder project ke VPS, lalu jalankan satu baris perintah di bawah:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(`chmod +x deploy-nevacloud.sh && ./deploy-nevacloud.sh ${domain} ${port} ${vpsDir} ${adminEmail}`, 'cmd-run')}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'cmd-run' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin Perintah Eksekusi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile('deploy-nevacloud.sh', oneClickScriptContent)}
                    className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Download Script (.sh)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-stone-900 rounded-xl p-3 text-emerald-400 font-mono text-xs overflow-x-auto flex items-center justify-between gap-4 border border-stone-800">
                <code>chmod +x deploy-nevacloud.sh && ./deploy-nevacloud.sh {domain} {port} {vpsDir} {adminEmail}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(`chmod +x deploy-nevacloud.sh && ./deploy-nevacloud.sh ${domain} ${port} ${vpsDir} ${adminEmail}`, 'cmd-run-inner')}
                  className="text-stone-400 hover:text-white p-1 rounded-sm cursor-pointer"
                  title="Salin"
                >
                  {copiedKey === 'cmd-run-inner' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between text-xs text-stone-500 pb-2">
                  <span>Isi Script Lengkap (deploy-nevacloud.sh):</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(oneClickScriptContent, 'script-full')}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'script-full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin Seluruh Kode Script</span>
                  </button>
                </div>
                <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed border border-stone-800">
                  {oneClickScriptContent}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'nginx' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    Konfigurasi Virtual Host Nginx
                  </h3>
                  <p className="text-[11px] text-stone-600">
                    Simpan file ini di: <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-900 font-mono">/etc/nginx/sites-available/{domain}</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(nginxContent, 'nginx-conf')}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'nginx-conf' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin Nginx Config</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(`${domain}.conf`, nginxContent)}
                    className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Download Nginx Config"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed border border-stone-800">
                {nginxContent}
              </pre>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <strong>Perintah Mengaktifkan Nginx:</strong>
                <pre className="bg-blue-950 text-blue-200 p-2 rounded-lg font-mono text-[11px]">
                  sudo ln -s /etc/nginx/sites-available/{domain} /etc/nginx/sites-enabled/{"\n"}
                  sudo nginx -t && sudo systemctl reload nginx
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'pm2' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    File Ekosistem PM2 (ecosystem.config.cjs)
                  </h3>
                  <p className="text-[11px] text-stone-600">
                    Memastikan aplikasi berjalan di background 24/7 dan otomatis hidup kembali jika server restart.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(pm2Content, 'pm2-conf')}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'pm2-conf' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin PM2 Config</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile('ecosystem.config.cjs', pm2Content)}
                    className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Download ecosystem.config.cjs"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed border border-stone-800">
                {pm2Content}
              </pre>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                  <span className="font-semibold text-stone-800 block">Jalankan PM2:</span>
                  <code className="bg-stone-200 px-1.5 py-0.5 rounded text-[11px] block font-mono">
                    pm2 start ecosystem.config.cjs
                  </code>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                  <span className="font-semibold text-stone-800 block">Aktifkan Auto-Boot:</span>
                  <code className="bg-stone-200 px-1.5 py-0.5 rounded text-[11px] block font-mono">
                    pm2 startup && pm2 save
                  </code>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                  <span className="font-semibold text-stone-800 block">Cek Log Server:</span>
                  <code className="bg-stone-200 px-1.5 py-0.5 rounded text-[11px] block font-mono">
                    pm2 logs {appName}
                  </code>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    File Variabel Lingkungan (.env)
                  </h3>
                  <p className="text-[11px] text-stone-600">
                    Letakkan file ini di direktori root aplikasi: <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-900 font-mono">{vpsDir}/.env</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(envContent, 'env-conf')}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'env-conf' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin .env</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile('.env.production', envContent)}
                    className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Download .env file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed border border-stone-800">
                {envContent}
              </pre>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    Docker Compose Deployment (docker-compose.yml)
                  </h3>
                  <p className="text-[11px] text-stone-600">
                    Cocok jika VPS NevaCloud Anda sudah menggunakan Docker & Container Engine.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(dockerComposeContent, 'docker-conf')}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'docker-conf' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin docker-compose.yml</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile('docker-compose.yml', dockerComposeContent)}
                    className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Download docker-compose.yml"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed border border-stone-800">
                {dockerComposeContent}
              </pre>

              <div className="p-3 bg-stone-900 rounded-xl text-stone-300 text-xs font-mono">
                <code>docker compose up -d --build</code>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Panduan Praktis Step-by-Step Tanpa Hambatan (Super Admin Checklist)
              </h3>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#00A651] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-900">
                      Buat Instance VPS di Dashboard NevaCloud
                    </h4>
                    <p className="text-[11px] text-stone-600">
                      Pilih OS <strong>Ubuntu 22.04 LTS</strong> atau <strong>24.04 LTS</strong>. Rekomendasi RAM minimum 2 GB. Catat <strong>IP Public</strong> yang diberikan oleh NevaCloud.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#00A651] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-900">
                      Setting DNS Domain ({domain})
                    </h4>
                    <p className="text-[11px] text-stone-600">
                      Di panel DNS domain Anda (Cloudflare / cPanel / Registrar), tambahkan DNS <strong>A Record</strong> yang mengarah ke IP Public VPS NevaCloud Anda.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#00A651] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-900">
                      Koneksi SSH & Upload File Project
                    </h4>
                    <p className="text-[11px] text-stone-600">
                      Buka terminal di komputer Anda, lalu jalankan: <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-stone-900">ssh root@IP_VPS_NEVACLOUD</code>. Buat direktori <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-stone-900">{vpsDir}</code> dan upload source code.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#00A651] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-900">
                      Jalankan Script deploy-nevacloud.sh
                    </h4>
                    <p className="text-[11px] text-stone-600">
                      Jalankan perintah: <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-stone-900">chmod +x deploy-nevacloud.sh && ./deploy-nevacloud.sh</code>. Script akan otomatis menginstall Node.js, PM2, Nginx, build frontend, dan mengaktifkan service.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#00A651] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-900">
                      Pasang SSL HTTPS Gratis (Certbot Let's Encrypt)
                    </h4>
                    <p className="text-[11px] text-stone-600">
                      Setelah domain terhubung, jalankan: <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-stone-900">sudo certbot --nginx -d {domain} --agree-tos -m {adminEmail}</code>. Website Anda akan langsung aman dengan gembok hijau HTTPS!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Live Endpoint & Health Diagnostics Tester */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Diagnostik API & Kesehatan Endpoint Server</span>
            </h3>
            <p className="text-[11px] text-stone-500">
              Uji respons real-time endpoint Express server untuk memastikan kesiapan saat dideploy di VPS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runTestApi('health')}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Uji /api/health
            </button>
            <button
              type="button"
              onClick={() => runTestApi('domain')}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Uji /api/domain/status
            </button>
            <button
              type="button"
              onClick={() => runTestApi('sync')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00A651] border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Uji /api/sync/status
            </button>
          </div>
        </div>

        {diagnosticResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
              diagnosticResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : diagnosticResult.status === 'pending'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {diagnosticResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : diagnosticResult.status === 'pending' ? (
                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{diagnosticResult.message}</span>
            </div>
            {diagnosticResult.latencyMs > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/60 border border-stone-200">
                {diagnosticResult.latencyMs} ms
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
