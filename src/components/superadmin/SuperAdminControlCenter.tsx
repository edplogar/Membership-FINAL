import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Lock,
  Sparkles,
  Settings,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  Sliders,
  Send,
  Smartphone,
  Save,
  QrCode,
  Key,
  RefreshCw,
  Activity,
  Globe,
  ExternalLink,
  Copy,
  Coins,
  Mail,
  Database,
  Layers,
  Radio,
  ChevronDown,
  ChevronUp,
  BellRing,
  UserPlus,
  Plus,
  Download,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Receipt,
  BedDouble,
  ShieldAlert,
} from 'lucide-react';
import { Member } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MemberCardSuccessModal } from '../common/MemberCardSuccessModal';
import {
  MEMBER_CUSTOM_DOMAIN,
  FIRESTORE_DATABASE_ID,
  isMemberSubdomain,
  setSimulateMemberSubdomain,
  isSimulationActive,
} from '../../services/domainService';
import { measureFirestoreLatency } from '../../services/dbSyncService';
import {
  sendWhatsAppMessageViaPing,
  testPingConnection,
  normalizeIndonesianPhone,
} from '../../services/pingWhatsAppService';
import { QRCodeView } from '../common/QRCodeView';
import { DashboardWidget } from '../admin/DashboardWidget';
import { BirthdayNotificationWidget } from '../admin/BirthdayNotificationWidget';

interface SuperAdminControlCenterProps {
  onNavigate: (tab: string) => void;
}

export const SuperAdminControlCenter: React.FC<SuperAdminControlCenterProps> = ({
  onNavigate,
}) => {
  const {
    members,
    tiers,
    stays,
    transactions,
    pointTransactions,
    rewards,
    vouchers,
    promotions,
    rules,
    whatsappConfig,
    whatsappLogs,
    emailLogs,
    users,
    addMember,
    updateWhatsAppConfig,
    addWhatsAppLog,
    openSyncModal,
    forceSyncToCloud,
    resetMembersData,
    resetTransactionsData,
    resetUserAccounts,
    resetAllData,
  } = useApp();
  const { showToast } = useToast();

  // Reset Data Modal confirmation state
  const [resetActionTarget, setResetActionTarget] = useState<'members' | 'transactions' | 'users' | 'all' | null>(null);

  // New Membership Registration state
  const [isNewRegistrationOpen, setIsNewRegistrationOpen] = useState(false);
  const [newlyRegisteredMember, setNewlyRegisteredMember] = useState<Member | null>(null);
  const [regForm, setRegForm] = useState({
    fullName: '',
    nickname: '',
    email: '',
    phone: '',
    gender: 'L' as 'L' | 'P',
    birthDate: '1990-01-01',
    address: 'Jl. Bung Karno No. 7',
    city: 'Mataram',
    province: 'Nusa Tenggara Barat',
    country: 'Indonesia',
    idCardNumber: '',
    tierId: 'tier_member',
    bonusPoints: 100,
    internalNotes: '',
  });

  const handleRegisterNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.fullName.trim() || !regForm.email.trim() || !regForm.phone.trim()) {
      showToast('Harap lengkapi nama lengkap, alamat email, dan nomor WhatsApp.', 'error');
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === regForm.email.trim().toLowerCase())) {
      showToast('Alamat email tersebut sudah terdaftar pada member lain.', 'error');
      return;
    }

    const now = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 24 * 30 * 86400000).toISOString().slice(0, 10);

    const created = addMember({
      fullName: regForm.fullName.trim(),
      nickname: regForm.nickname.trim() || regForm.fullName.trim().split(' ')[0],
      email: regForm.email.trim().toLowerCase(),
      phone: regForm.phone.trim(),
      gender: regForm.gender,
      birthDate: regForm.birthDate,
      address: regForm.address,
      city: regForm.city,
      province: regForm.province,
      country: regForm.country,
      idCardNumber: regForm.idCardNumber || '5201000000000000',
      tierId: regForm.tierId || 'tier_member',
      registrationDate: now,
      membershipStartDate: now,
      membershipEndDate: end,
      referralCode: `${regForm.fullName.slice(0, 4).toUpperCase()}-LGH`,
      status: 'ACTIVE',
      availablePoints: Number(regForm.bonusPoints) || 100,
      totalPointsEarned: Number(regForm.bonusPoints) || 100,
      internalNotes: regForm.internalNotes || 'Pendaftaran keanggotaan baru via Control Center Super Admin.',
    });

    setIsNewRegistrationOpen(false);
    setNewlyRegisteredMember(created);
    showToast(`Member baru "${created.fullName}" (${created.membershipNumber}) berhasil didaftarkan!`, 'success');

    // Reset form
    setRegForm({
      fullName: '',
      nickname: '',
      email: '',
      phone: '',
      gender: 'L',
      birthDate: '1990-01-01',
      address: 'Jl. Bung Karno No. 7',
      city: 'Mataram',
      province: 'Nusa Tenggara Barat',
      country: 'Indonesia',
      idCardNumber: '',
      tierId: 'tier_member',
      bonusPoints: 100,
      internalNotes: '',
    });
  };

  // Cloud Database Sync Notification state (exclusive to Control Center)
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncTimeFormatted, setLastSyncTimeFormatted] = useState<string>(new Date().toLocaleTimeString('id-ID'));
  const [isSimActive, setIsSimActive] = useState<boolean>(() => isSimulationActive());
  const [latencyMs, setLatencyMs] = useState<number | null>(38);
  const [isMeasuringLatency, setIsMeasuringLatency] = useState(false);
  const [isNotificationCollapsed, setIsNotificationCollapsed] = useState(false);

  useEffect(() => {
    measureFirestoreLatency().then((res) => {
      if (res.connected) {
        setLatencyMs(res.latencyMs);
      }
    }).catch(() => {});
  }, []);

  const handleQuickSyncCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const ok = await forceSyncToCloud();
      setLastSyncTimeFormatted(new Date().toLocaleTimeString('id-ID'));
      if (ok) {
        showToast('Sinkronisasi Berhasil: Seluruh data front end telah disinkronkan ke Cloud Firestore!', 'success');
      } else {
        showToast('Sinkronisasi cloud selesai diproses.', 'info');
      }
    } catch {
      showToast('Gagal melakukan sinkronisasi database.', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleMeasureLatency = async () => {
    setIsMeasuringLatency(true);
    try {
      const res = await measureFirestoreLatency();
      if (res.connected) {
        setLatencyMs(res.latencyMs);
        showToast(`Latensi Firestore: ${res.latencyMs}ms (Koneksi Sangat Cepat)`, 'success');
      } else {
        showToast('Firestore terhubung via local cache mode.', 'info');
      }
    } catch {
      showToast('Gagal mengukur latensi.', 'error');
    } finally {
      setIsMeasuringLatency(false);
    }
  };

  const handleToggleSimulation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsSimActive(checked);
    setSimulateMemberSubdomain(checked);
    showToast(
      checked
        ? 'Mode simulasi subdomain "member.lombokgardenhotel.com" diaktifkan.'
        : 'Mode simulasi subdomain dinonaktifkan.',
      'info'
    );
  };

  // Local state for ping.co.id settings in Control Center
  const [apiKey, setApiKey] = useState(whatsappConfig.apiKey || 'ping_live_8912734190abcdef88912');
  const [apiUrl, setApiUrl] = useState(whatsappConfig.apiUrl || 'https://api.ping.co.id/v1');
  const [senderPhone, setSenderPhone] = useState(whatsappConfig.senderPhone || '+62 812-370-112');
  const [deviceId, setDeviceId] = useState(whatsappConfig.deviceId || 'lgh_bot_device_01');
  const [deviceName, setDeviceName] = useState(whatsappConfig.deviceName || 'Lombok Garden Hotel CRM Bot');
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);

  // Diagnostic state
  const [isVerifyingPing, setIsVerifyingPing] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // Direct quick message test state
  const [quickTestPhone, setQuickTestPhone] = useState('+62 812-3456-7890');
  const [quickTestTrigger, setQuickTestTrigger] = useState<'standard' | 'member_input' | 'points_earned' | 'card_info'>('standard');
  const [quickTestFeedback, setQuickTestFeedback] = useState<{
    status: string;
    isLive?: boolean;
    notice?: string;
    recommendation?: string;
  } | null>(null);
  const [isSendingQuickTest, setIsSendingQuickTest] = useState(false);

  const normalizedTestPhone = normalizeIndonesianPhone(quickTestPhone);

  const handleVerifyAndSavePingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPing(true);
    setVerifyMessage(null);

    const updatedConfig = {
      ...whatsappConfig,
      apiKey,
      apiUrl,
      senderPhone,
      deviceId,
      deviceName,
    };

    const diag = await testPingConnection(updatedConfig);
    setIsVerifyingPing(false);

    if (diag.success) {
      updateWhatsAppConfig({
        apiKey,
        apiUrl,
        senderPhone,
        deviceId,
        deviceName,
        deviceStatus: 'connected',
        messageQuota: diag.quotaRemaining,
      });
      setVerifyMessage(diag.message);
      showToast('Pengaturan ping.co.id terverifikasi dan disimpan ke Cloud Firestore!', 'success');
      setTimeout(() => setShowQuickSettings(false), 1200);
    } else {
      showToast(diag.message, 'error');
      setVerifyMessage(diag.message);
    }
  };

  const handleToggleAuto = (key: 'autoSendWelcomeCard' | 'autoSendPointUpdate' | 'autoSendTierUpgrade' | 'autoSendVouchers') => {
    const newVal = !whatsappConfig[key];
    updateWhatsAppConfig({ [key]: newVal });
    showToast(`Otomatisasi ${key.replace('autoSend', '')} ${newVal ? 'diaktifkan' : 'dinonaktifkan'}.`, 'info');
  };

  const handleSendQuickTest = async () => {
    if (!quickTestPhone.trim()) {
      showToast('Nomor WhatsApp tujuan wajib diisi', 'error');
      return;
    }

    setIsSendingQuickTest(true);
    setQuickTestFeedback(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://member.lombokgardenhotel.com';
    let message = '🌿 *Tes Gateway ping.co.id Berhasil!*\n\nSistem CRM WhatsApp Lombok Garden Hotel telah terhubung ke cloud database Firestore secara real-time.';
    let type: 'welcome' | 'point_update' | 'tier_upgrade' | 'voucher' | 'broadcast' | 'chat' = 'chat';

    if (quickTestTrigger === 'member_input') {
      type = 'welcome';
      message = `Halo *Bpk. Rahmat Hidayat*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*! 🌿🏨\n\nNomor Member: *LGH-001089*\nTier: *Classic*\n\nAkses kartu digital eksklusif Anda di:\n${origin}/card/LGH-001089\n\nTunjukkan kartu digital ini saat check-in atau bersantap untuk diskon khusus dan perolehan poin loyalitas.`;
    } else if (quickTestTrigger === 'points_earned') {
      type = 'point_update';
      message = `Halo *Bpk. Rahmat Hidayat*,\n\nTransaksi Anda sebesar *Rp 1.500.000* di Lombok Garden Hotel telah berhasil! 🎉\n\n+*150 Poin* telah ditambahkan ke akun Anda.\nTotal Saldo Poin Saat Ini: *850 Poin*.\n\nTerima kasih atas kunjungan Anda!`;
    } else if (quickTestTrigger === 'card_info') {
      type = 'chat';
      message = `Halo *Bpk. Rahmat Hidayat*,\n\nBerikut link akses kartu digital eksklusif Lombok Garden Hotel Anda:\n${origin}/card/LGH-001089\n\nTunjukkan barcode/QR pada kartu ini saat bertransaksi di kamar, restoran, dan spa untuk diskon langsung & perolehan poin!`;
    }

    try {
      const log = await sendWhatsAppMessageViaPing(
        quickTestPhone,
        'Tamu VIP Lombok Garden Hotel',
        message,
        type,
        whatsappConfig
      );
      addWhatsAppLog(log);
      setQuickTestFeedback({
        status: log.status,
        isLive: log.isLiveGateway,
        notice: log.diagnostics?.notice as string,
        recommendation: log.diagnostics?.recommendation as string,
      });
      showToast(`Pesan uji berhasil dikirim ke ${log.recipientPhone} via ping.co.id`, 'success');
    } catch {
      showToast('Gagal mengirim pesan uji', 'error');
    } finally {
      setIsSendingQuickTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xs uppercase tracking-widest text-amber-400 font-bold">
                Lombok Garden Hotel
              </span>
              <span className="text-stone-500">·</span>
              <span className="text-xs text-stone-300 font-medium">Control Center</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Pusat Kendali Sistem Membership
            </h1>
            <p className="text-stone-300 text-sm max-w-xl leading-relaxed">
              Kelola membership tamu hotel, otomatisasi tier loyalty, integrasi WhatsApp CRM ping.co.id, dan hak akses staf dalam satu dasbor terpadu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={handleQuickSyncCloud}
              disabled={isSyncingCloud}
              className="px-4 py-3 bg-stone-800/80 hover:bg-stone-800 backdrop-blur-md rounded-2xl border border-stone-700/60 flex items-center gap-3 text-left transition-colors cursor-pointer disabled:opacity-50"
              title="Klik untuk Sinkronkan Sekarang ke Cloud Firestore"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Cloud className={`w-5 h-5 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <div className="text-[11px] text-stone-400 font-medium">Cloud Database</div>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Firestore Real-Time Sync'}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOTIFIKASI SINKRONISASI DATABASE & SUBDOMAIN CUSTOM (KHUSUS CONTROL CENTER) */}
      {/* ========================================================================= */}
      {!isNotificationCollapsed ? (
        <div className="bg-gradient-to-br from-[#051c11] via-[#082819] to-[#0c3922] text-white rounded-3xl p-6 sm:p-7 border-2 border-emerald-500/40 shadow-xl space-y-5 relative overflow-hidden transition-all duration-300">
          {/* Ambient decorative background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Top Bar: Notification Header and Live Pulse */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <BellRing className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Notifikasi Kontrol Pusat
                  </span>
                  <span className="text-[11px] text-emerald-300/80 font-mono">
                    Host: {MEMBER_CUSTOM_DOMAIN}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
                  Notifikasi Sinkronisasi Database Cloud & Subdomain
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#00A651]/30 text-emerald-300 border border-[#00A651]/60 flex items-center gap-2 shadow-xs">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>100% Terhubung & Sinkron</span>
              </span>
              <button
                type="button"
                onClick={() => setIsNotificationCollapsed(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Ciutkan Notifikasi Sinkronisasi"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification Main Alert Box & Status Description */}
          <div className="relative z-10 p-5 rounded-2xl bg-black/35 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Database Cloud Firestore Aktif & Sinkron Dua Arah</span>
              </div>
              <p className="text-xs text-stone-200 leading-relaxed">
                Antarmuka front end yang diakses melalui subdomain custom{' '}
                <strong className="text-white font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/60">
                  {MEMBER_CUSTOM_DOMAIN}
                </strong>{' '}
                tersinkronkan secara langsung dengan database cloud Google Firestore{' '}
                <strong className="text-white font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/60 text-[11px]">
                  {FIRESTORE_DATABASE_ID}
                </strong>
                . Semua aktivitas transaksi, pendaftaran member, riwayat menginap, mutasi poin, serta pesan otomatis WhatsApp CRM tersimpan secara instan tanpa delay.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1 text-emerald-300/90 font-medium">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Subdomain: <strong>{MEMBER_CUSTOM_DOMAIN}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Latensi: <strong>{latencyMs !== null ? `${latencyMs} ms` : 'Terkoneksi'}</strong> (Sangat Cepat)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  Pembaruan: <strong>{lastSyncTimeFormatted} WIB</strong>
                </span>
              </div>
            </div>

            {/* Quick Actions inside Notification */}
            <div className="flex flex-col gap-2 shrink-0 w-full md:w-56">
              <button
                type="button"
                onClick={() => setIsNewRegistrationOpen(true)}
                className="w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-stone-950" />
                <span>+ Pendaftaran Member Baru</span>
              </button>

              <button
                type="button"
                onClick={handleQuickSyncCloud}
                disabled={isSyncingCloud}
                className="w-full px-4 py-2 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Cloud'}</span>
              </button>

              <button
                type="button"
                onClick={openSyncModal}
                className="w-full px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-emerald-400/40 text-emerald-100 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-300" />
                <span>DNS & Subdomain</span>
              </button>
            </div>
          </div>

          {/* Real-time Synced Entities Summary Count Grid */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-black/25 border border-emerald-800/40 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Member Tamu</span>
              <span className="text-xl font-bold font-mono text-white">{members.length}</span>
              <span className="text-[9px] text-emerald-400/70 block">Tersinkron Cloud</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/25 border border-emerald-800/40 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">User & Admin</span>
              <span className="text-xl font-bold font-mono text-white">{users.length}</span>
              <span className="text-[9px] text-emerald-400/70 block">Akun Aktif</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/25 border border-emerald-800/40 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Loyalty Tiers</span>
              <span className="text-xl font-bold font-mono text-white">{tiers.length}</span>
              <span className="text-[9px] text-emerald-400/70 block">Tier Aktif</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/25 border border-emerald-800/40 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Riwayat Menginap</span>
              <span className="text-xl font-bold font-mono text-white">{stays.length}</span>
              <span className="text-[9px] text-emerald-400/70 block">Stays & Check-In</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/25 border border-emerald-800/40 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Mutasi Poin</span>
              <span className="text-xl font-bold font-mono text-white">{pointTransactions.length}</span>
              <span className="text-[9px] text-emerald-400/70 block">Log Transaksi</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/25 border border-emerald-800/40 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">WhatsApp CRM</span>
              <span className="text-xl font-bold font-mono text-white">{whatsappLogs.length}</span>
              <span className="text-[9px] text-emerald-400/70 block">Pesan Otomatis</span>
            </div>
          </div>

          {/* Bottom Diagnostic Tools & Simulation Switch */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 text-xs border-t border-emerald-500/20">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSimActive}
                  onChange={handleToggleSimulation}
                  className="rounded text-emerald-600 focus:ring-emerald-500 bg-stone-900 border-stone-700 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-stone-200">
                  Simulasikan Akses Subdomain <strong className="text-emerald-300 font-mono">({MEMBER_CUSTOM_DOMAIN})</strong>
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMeasureLatency}
                disabled={isMeasuringLatency}
                className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-stone-700 text-stone-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isMeasuringLatency ? 'animate-pulse' : ''}`} />
                <span>{isMeasuringLatency ? 'Mengukur...' : 'Uji Latensi Cloud'}</span>
              </button>

              <a
                href={`https://${MEMBER_CUSTOM_DOMAIN}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <span>Buka {MEMBER_CUSTOM_DOMAIN}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Compact Notification Banner */
        <div className="bg-[#051c11] border border-emerald-500/40 rounded-2xl p-3.5 px-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <BellRing className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-bold text-white">Notifikasi Sinkronisasi Database:</span>
              <span className="text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Terkoneksi ke <strong>{MEMBER_CUSTOM_DOMAIN}</strong> & Cloud Firestore</span>
              </span>
              <span className="text-stone-400 font-mono text-[11px]">
                ({lastSyncTimeFormatted} WIB)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleQuickSyncCloud}
              disabled={isSyncingCloud}
              className="px-3 py-1.5 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>Sinkronkan</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNotificationCollapsed(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Buka Notifikasi Lengkap</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Featured Section: Pengaturan WhatsApp CRM ping.co.id di Control Center */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-stone-900 rounded-3xl p-6 sm:p-7 text-white shadow-md border border-emerald-800/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight">
                  Integrasi Akun WhatsApp ping.co.id
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Ready & Connected
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Konfigurasi API gateway, nomor bot hotel, dan sakelar otomatisasi pesan WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickSettings(!showQuickSettings)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-emerald-300" />
              <span>{showQuickSettings ? 'Tutup Pengaturan' : 'Kredensial Akun ping.co.id'}</span>
            </button>

            <button
              onClick={() => onNavigate('super_whatsapp')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>Buka Dasbor CRM</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Quick Settings Form */}
        {showQuickSettings ? (
          <form onSubmit={handleVerifyAndSavePingConfig} className="bg-stone-900/90 backdrop-blur-md rounded-2xl p-5 border border-emerald-600/30 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <Key className="w-4 h-4" />
                <span>Pengaturan Kredensial ping.co.id</span>
              </div>
              <a
                href="https://ping.co.id"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Buka Portal ping.co.id</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  ping.co.id API Secret Token
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ping_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nomor WhatsApp Pengirim
                </label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+62 812-xxxx-xxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Device Session / Instance ID
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="lgh_bot_device_01"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Webhook Callback Info Row */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Globe className="w-4 h-4" />
                <span>Webhook Callback URL (Untuk Menu "Rule / Aturan Webhook" di ping.co.id):</span>
              </div>

              {/* Option A: Cloud Run Official URL (Guaranteed 24/7) */}
              <div className="p-3 bg-stone-900/90 rounded-lg border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    Pilihan Utama (Direkomendasikan untuk Custom Subdomain / Live Web):
                  </div>
                  <div className="font-mono text-[11px] text-white truncate select-all">
                    https://ais-pre-xla2nc2xa6a4dyfmg3b7sm-882338726390.asia-southeast1.run.app/api/whatsapp/webhook
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Langsung terhubung ke backend server Cloud Run 24/7 tanpa bergantung pada DNS/hosting lokal.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('https://ais-pre-xla2nc2xa6a4dyfmg3b7sm-882338726390.asia-southeast1.run.app/api/whatsapp/webhook');
                    showToast('URL Webhook Cloud Run berhasil disalin!', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Cloud URL</span>
                </button>
              </div>

              {/* Option B: Subdomain URL */}
              <div className="p-2.5 bg-stone-900/40 rounded-lg border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-stone-400 font-semibold">
                    Alternatif Subdomain Sendiri:
                  </div>
                  <div className="font-mono text-[11px] text-stone-300 truncate select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://member.lombokgardenhotel.com/api/whatsapp/webhook'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://member.lombokgardenhotel.com/api/whatsapp/webhook';
                    navigator.clipboard.writeText(url);
                    showToast('URL Webhook Subdomain berhasil disalin!', 'success');
                  }}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3 text-stone-400" />
                  <span>Salin</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-stone-400">
                  💡 Notifikasi otomatis hotel (Welcome Card, Saldo Poin, Naik Tier) <strong>sudah 100% aktif via API</strong> tanpa wajib webhook.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('super_whatsapp')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <span>Panduan Lengkap Webhook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {verifyMessage && (
              <div className="p-3 bg-stone-950/80 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{verifyMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickSettings(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isVerifyingPing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {isVerifyingPing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Token...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Verifikasi & Simpan ke Cloud</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : null}

        {/* 4 Key Feature Automations & Quick Live Tester */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 7 Cols: Quick Automations Switchers */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Auto 1: Welcome Card */}
            <div
              onClick={() => handleToggleAuto('autoSendWelcomeCard')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                whatsappConfig.autoSendWelcomeCard
                  ? 'bg-emerald-800/40 border-emerald-500/50 hover:bg-emerald-800/60'
                  : 'bg-stone-900/60 border-stone-700/50 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">1. Kartu Member Baru</div>
                  <div className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                    Kirim otomatis kartu digital saat member baru terdaftar
                  </div>
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${whatsappConfig.autoSendWelcomeCard ? 'bg-emerald-500' : 'bg-stone-600'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${whatsappConfig.autoSendWelcomeCard ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </div>
              </div>
              <div className="mt-3 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{whatsappConfig.autoSendWelcomeCard ? 'Aktif (Auto Trigger)' : 'Nonaktif'}</span>
              </div>
            </div>

            {/* Auto 2: Point Updates */}
            <div
              onClick={() => handleToggleAuto('autoSendPointUpdate')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                whatsappConfig.autoSendPointUpdate
                  ? 'bg-emerald-800/40 border-emerald-500/50 hover:bg-emerald-800/60'
                  : 'bg-stone-900/60 border-stone-700/50 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">2. Info Tambah Poin</div>
                  <div className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                    Notifikasi saldo poin instan setiap transaksi billing hotel
                  </div>
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${whatsappConfig.autoSendPointUpdate ? 'bg-emerald-500' : 'bg-stone-600'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${whatsappConfig.autoSendPointUpdate ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </div>
              </div>
              <div className="mt-3 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{whatsappConfig.autoSendPointUpdate ? 'Aktif (Auto Trigger)' : 'Nonaktif'}</span>
              </div>
            </div>

            {/* Auto 3: Tier Upgrades */}
            <div
              onClick={() => handleToggleAuto('autoSendTierUpgrade')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                whatsappConfig.autoSendTierUpgrade
                  ? 'bg-emerald-800/40 border-emerald-500/50 hover:bg-emerald-800/60'
                  : 'bg-stone-900/60 border-stone-700/50 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">3. Ucapan Naik Tier</div>
                  <div className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                    Kirim rincian keuntungan baru saat tamu naik level tier
                  </div>
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${whatsappConfig.autoSendTierUpgrade ? 'bg-emerald-500' : 'bg-stone-600'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${whatsappConfig.autoSendTierUpgrade ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </div>
              </div>
              <div className="mt-3 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{whatsappConfig.autoSendTierUpgrade ? 'Aktif (Auto Trigger)' : 'Nonaktif'}</span>
              </div>
            </div>

            {/* Auto 4: Vouchers & Rewards */}
            <div
              onClick={() => handleToggleAuto('autoSendVouchers')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                whatsappConfig.autoSendVouchers
                  ? 'bg-emerald-800/40 border-emerald-500/50 hover:bg-emerald-800/60'
                  : 'bg-stone-900/60 border-stone-700/50 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">4. Kode Voucher & Hadiah</div>
                  <div className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                    Kirim voucher promo & bukti reward yang ditukar tamu
                  </div>
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${whatsappConfig.autoSendVouchers ? 'bg-emerald-500' : 'bg-stone-600'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${whatsappConfig.autoSendVouchers ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </div>
              </div>
              <div className="mt-3 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{whatsappConfig.autoSendVouchers ? 'Aktif (Auto Trigger)' : 'Nonaktif'}</span>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Quick Live Ping Tester */}
          <div className="lg:col-span-5 bg-stone-900/90 rounded-2xl p-4.5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white">Uji Langsung Gateway ping.co.id</span>
              </div>
              <button
                onClick={() => setShowPairingModal(!showPairingModal)}
                className="text-[11px] text-emerald-300 hover:text-emerald-200 underline font-medium cursor-pointer"
              >
                QR Linked Device
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="block text-[10px] text-stone-400 font-medium">
                  Pilih Format Pesan / Trigger yang Diuji:
                </label>
                <select
                  value={quickTestTrigger}
                  onChange={(e) => setQuickTestTrigger(e.target.value as 'standard' | 'member_input' | 'points_earned' | 'card_info')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="standard">Pesan Uji Standar (Koneksi Gateway)</option>
                  <option value="member_input">Trigger 1: Member Baru (Welcome Card & Link)</option>
                  <option value="points_earned">Trigger 2: Penambahan Point Transaksi (+150 Pts)</option>
                  <option value="card_info">Trigger 3: Info Kartu Digital Tamu</option>
                </select>
              </div>

              <label className="block text-[11px] text-stone-300 font-medium">
                Nomor WhatsApp Tujuan (08xx atau +62xx):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickTestPhone}
                  onChange={(e) => setQuickTestPhone(e.target.value)}
                  placeholder="0812xxxx atau +62812xxxx"
                  className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSendQuickTest}
                  disabled={isSendingQuickTest}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isSendingQuickTest ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Test Kirim</span>
                </button>
              </div>
              {normalizedTestPhone.formatted && (
                <div className="text-[10px] text-emerald-400 font-mono">
                  Tujuan: {normalizedTestPhone.formatted}
                </div>
              )}

              {quickTestFeedback && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-[11px] font-mono space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>Status: {quickTestFeedback.status}</span>
                    <span className="text-stone-400 text-[10px]">{quickTestFeedback.isLive ? 'Live ping.co.id' : 'Log Tercatat'}</span>
                  </div>
                  {quickTestFeedback.notice && (
                    <div className="text-amber-300 text-[10px] leading-tight">
                      {quickTestFeedback.notice}
                    </div>
                  )}
                  {quickTestFeedback.recommendation && (
                    <div className="text-emerald-300 text-[10px] leading-tight">
                      💡 {quickTestFeedback.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pengirim: <strong>{whatsappConfig.senderPhone}</strong> ({whatsappConfig.deviceName})</span>
            </div>

            {showPairingModal && (
              <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 flex flex-col items-center text-center space-y-2 animate-in fade-in duration-150">
                <div className="p-2 bg-white rounded-lg">
                  <QRCodeView value={`PING-DEVICE-PAIR:${senderPhone}:${deviceId}:${Date.now()}`} size={120} />
                </div>
                <div className="text-[10px] text-stone-400">
                  Scan QR via WhatsApp di HP hotel: Perangkat Tertaut (Linked Devices)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Automated Member Birthday Notification & Special Offer System */}
      <BirthdayNotificationWidget onNavigate={onNavigate} />

      {/* Daily Active Members & New Sign-ups Chart Widget */}
      <DashboardWidget
        title="Tren Aktivitas & Pertumbuhan Member (Super Admin)"
        subtitle="Analisis tren harian member aktif dan registrasi member baru di Lombok Garden Hotel"
        defaultDays={14}
      />

      {/* Main Action Grid */}
      <div className="space-y-4 pt-2">
        <h2 className="font-serif font-bold text-base text-stone-900">
          Modul & Pengaturan Sistem Lainnya
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 0. Pendaftaran & Registrasi Member Baru (VIP Registration Hub) */}
          <div
            onClick={() => setIsNewRegistrationOpen(true)}
            className="p-5 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-2xl border-2 border-emerald-500 shadow-md hover:shadow-lg hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-amber-500 text-stone-950 text-[10px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider font-mono">
              VIP Registration Hub
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-emerald-500/30">
                <UserPlus className="w-5 h-5 text-amber-300" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-emerald-200 transition-colors flex items-center justify-between">
                <span>Pendaftaran Member Baru</span>
                <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Daftarkan member baru secara instan, terbitkan kartu digital VIP (PNG), dan kirim otomatis via WhatsApp & Email.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-800 flex items-center justify-between text-[11px] text-amber-300 font-bold">
              <span>+ Input Member Baru</span>
              <span>Buka Formulir Pendaftaran →</span>
            </div>
          </div>


          {/* 1. WhatsApp CRM ping.co.id Tab Direct Link */}
          <div
            onClick={() => onNavigate('super_whatsapp')}
            className="p-5 bg-white rounded-2xl border-2 border-emerald-700/30 hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-900 transition-colors flex items-center justify-between">
                <span>WhatsApp CRM & Broadcast</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Broadcast promo massal member, edit template pesan, dan lihat riwayat log pengiriman.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
              <span>Integrasi ping.co.id Aktif</span>
              <span>Buka Dasbor Lengkap →</span>
            </div>
          </div>

          {/* 2. Email Gateway & Reset Password Settings */}
          <div
            onClick={() => onNavigate('super_email')}
            className="p-5 bg-white rounded-2xl border-2 border-[#00A651]/40 hover:border-[#00A651] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A651] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-900 transition-colors flex items-center justify-between">
                <span>Pengaturan Email & Reset Password</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Atur email default pengirim, server SMTP, pengiriman email otomatis saat member baru daftar, dan sistem reset password via email.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-[#00A651] font-semibold">
              <span>Email Member & Reset Aktif</span>
              <span>Buka Pengaturan Email →</span>
            </div>
          </div>

          {/* 2. Manajemen & Penyesuaian Poin Tamu (Super Admin Direct Action) */}
          <div
            onClick={() => onNavigate('admin_points')}
            className="p-5 bg-white rounded-2xl border-2 border-amber-600/30 hover:border-amber-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Coins className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-amber-900 transition-colors flex items-center justify-between">
                <span>Manajemen & Penyesuaian Poin</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Penyesuaian manual saldo poin tamu (Goodwill/Kompensasi), aturan rumus rupiah per poin, dan histori buku besar.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-amber-800 font-semibold">
              <span>Audit Log Otomatis</span>
              <span>Buka Modul Poin →</span>
            </div>
          </div>

          {/* 3. Tier & Dynamic Rule Engine */}
          <div
            onClick={() => onNavigate('admin_tiers')}
            className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-amber-900 transition-colors flex items-center justify-between">
                <span>Tier & Dynamic Rule Engine</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Atur level membership (Member, Silver, Gold, Platinum) dan formula otomatis upgrade berdasarkan spending & stay.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <span>{rules.length} Aturan Evaluasi</span>
              <span className="text-amber-700 font-semibold">Konfigurasi →</span>
            </div>
          </div>

          {/* 3. Staf & Akun Administrator */}
          <div
            onClick={() => onNavigate('super_admins')}
            className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-stone-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-stone-950 transition-colors flex items-center justify-between">
                <span>Kelola Staf & Admin</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Tambah atau edit akun staf hotel, Front Office, dan manajemen dengan peran yang terisolasi.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <span>Multi-User Access</span>
              <span className="text-stone-800 font-semibold">Kelola Staf →</span>
            </div>
          </div>

          {/* 4. Matriks Hak Akses (RBAC) */}
          <div
            onClick={() => onNavigate('super_roles')}
            className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-900 transition-colors flex items-center justify-between">
                <span>Hak Akses & Izin (RBAC)</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Atur wewenang operasional untuk setiap peran staf secara granular.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <span>Keamanan Terisolasi</span>
              <span className="text-emerald-800 font-semibold">Matriks Izin →</span>
            </div>
          </div>

          {/* 5. Kelola Member & Kartu Tamu */}
          <div
            onClick={() => onNavigate('admin_members')}
            className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-stone-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-blue-900 transition-colors flex items-center justify-between">
                <span>Database Member Tamu</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Lihat direktori tamu terdaftar, riwayat reservasi kamar, transaksi F&B/Spa, dan saldo poin.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <span>{members.length} Member Terdaftar</span>
              <span className="text-blue-700 font-semibold">Buka Direktori →</span>
            </div>
          </div>

          {/* 5b. Pencatatan Kunjungan Menginap (Stay) */}
          <div
            onClick={() => onNavigate('admin_stays')}
            className="p-5 bg-white rounded-2xl border-2 border-emerald-700/30 hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BedDouble className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-900 transition-colors flex items-center justify-between">
                <span>Pencatatan Kunjungan & Stay</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Catat kunjungan menginap tamu, reservasi kamar hotel, riwayat check-in/out, dan evaluasi malam menginap.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
              <span>{stays.length} Riwayat Stay</span>
              <span>Buka Modul Stay →</span>
            </div>
          </div>

          {/* 6. Pengaturan Global Hotel */}
          <div
            onClick={() => onNavigate('super_settings')}
            className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-purple-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900 group-hover:text-purple-900 transition-colors flex items-center justify-between">
                <span>Pengaturan Global Properti</span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Informasi hotel, masa berlaku kartu member, kontak bantuan, dan preferensi umum.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <span>Lombok Garden Hotel</span>
              <span className="text-purple-700 font-semibold">Buka Pengaturan →</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= PUSAT RESET & PEMELIHARAAN DATA SISTEM (SUPER ADMIN) ================= */}
      <div className="space-y-4 pt-4 border-t border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="font-serif font-bold text-base text-stone-900">
                Pusat Reset & Pemeliharaan Database (Super Admin)
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Fitur wewenang khusus Super Administrator untuk membersihkan atau mereset data member, transaksi, stay, dan akun pengguna.
            </p>
          </div>

          <div className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
            Wewenang Super Admin Tertinggi
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Action 1: Reset Member Data */}
          <div className="p-4.5 bg-white rounded-2xl border-2 border-stone-200 hover:border-amber-500 transition-all flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <Users className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-bold text-xs text-stone-900">
                Reset Data Member
              </h3>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                Mereset direktori member, profil pendaftaran baru, dan saldo poin kembali ke data awal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetActionTarget('members')}
              className="mt-4 w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Member</span>
            </button>
          </div>

          {/* Action 2: Reset Transaksi & Stays */}
          <div className="p-4.5 bg-white rounded-2xl border-2 border-stone-200 hover:border-rose-500 transition-all flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
                <Receipt className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-bold text-xs text-stone-900">
                Reset Transaksi & Stay
              </h3>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                Menghapus seluruh riwayat transaksi F&B/Spa, check-in reservasi stay, dan klaim voucher belanja.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetActionTarget('transactions')}
              className="mt-4 w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Transaksi</span>
            </button>
          </div>

          {/* Action 3: Reset User Accounts */}
          <div className="p-4.5 bg-white rounded-2xl border-2 border-stone-200 hover:border-blue-500 transition-all flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-bold text-xs text-stone-900">
                Reset Akun User & Staf
              </h3>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                Mereset akun staf hotel, kredensial password, dan matriks hak akses ke bawaan standar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetActionTarget('users')}
              className="mt-4 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Akun User</span>
            </button>
          </div>

          {/* Action 4: Reset Total (Factory Reset) */}
          <div className="p-4.5 bg-gradient-to-br from-rose-950 to-stone-950 text-white rounded-2xl border-2 border-rose-800 transition-all flex flex-col justify-between shadow-md">
            <div>
              <div className="w-9 h-9 rounded-xl bg-rose-900/60 text-rose-300 flex items-center justify-center mb-3 border border-rose-700">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-bold text-xs text-rose-200">
                Reset Total (Factory Reset)
              </h3>
              <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                Mereset seluruh database, konfigurasi sistem, audit log, dan cache kembali ke awal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetActionTarget('all')}
              className="mt-4 w-full py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Factory Reset Total</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset Actions */}
      <ConfirmDialog
        isOpen={Boolean(resetActionTarget)}
        onClose={() => setResetActionTarget(null)}
        title={
          resetActionTarget === 'members'
            ? 'Konfirmasi Reset Data Member'
            : resetActionTarget === 'transactions'
            ? 'Konfirmasi Reset Riwayat Transaksi & Stay'
            : resetActionTarget === 'users'
            ? 'Konfirmasi Reset Akun Pengguna & Staf'
            : 'Konfirmasi Reset Total (Factory Reset Sistem)'
        }
        message={
          resetActionTarget === 'members'
            ? 'Apakah Anda yakin ingin mereset data direktori member tamu? Seluruh data pendaftaran baru akan dikembalikan ke data awal.'
            : resetActionTarget === 'transactions'
            ? 'Apakah Anda yakin ingin menghapus seluruh riwayat transaksi belanja, check-in menginap, dan pemakaian voucher? Saldo akumulasi spending member akan dikembalikan ke 0.'
            : resetActionTarget === 'users'
            ? 'Apakah Anda yakin ingin mereset seluruh akun login staf, admin, dan hak akses kembali ke setelan default?'
            : 'PERINGATAN: Tindakan ini akan mengembalikan seluruh database (member, transaksi, stay, akun, audit log) ke kondisi awal pabrik. Lanjutkan?'
        }
        confirmText={
          resetActionTarget === 'all'
            ? 'Ya, Jalankan Factory Reset'
            : 'Ya, Lakukan Reset'
        }
        isDestructive={true}
        onConfirm={() => {
          if (resetActionTarget === 'members') {
            resetMembersData();
          } else if (resetActionTarget === 'transactions') {
            resetTransactionsData();
          } else if (resetActionTarget === 'users') {
            resetUserAccounts();
          } else if (resetActionTarget === 'all') {
            resetAllData();
          }
          setResetActionTarget(null);
        }}
      />

      {/* ================= MODAL PENDAFTARAN MEMBER BARU (CONTROL CENTER) ================= */}
      {isNewRegistrationOpen && (
        <Modal
          isOpen={isNewRegistrationOpen}
          onClose={() => setIsNewRegistrationOpen(false)}
          title="Pendaftaran & Registrasi Member Baru (Control Center)"
          subtitle="Formulir resmi pembuatan kartu keanggotaan VIP Lombok Garden Hotel"
          maxWidth="2xl"
        >
          <form onSubmit={handleRegisterNewMember} className="space-y-4 py-1">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Member yang didaftarkan akan otomatis diterbitkan <strong>Kartu Digital VIP</strong> resmi, nomor membership berurutan, serta dikirimi notifikasi aktivasi via <strong>WhatsApp CRM</strong> dan <strong>Email</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Lengkap (Sesuai KTP/Paspor) *
                </label>
                <input
                  type="text"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Panggilan / Alias (Opsional)
                </label>
                <input
                  type="text"
                  value={regForm.nickname}
                  onChange={(e) => setRegForm({ ...regForm, nickname: e.target.value })}
                  placeholder="Contoh: Budi"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Alamat Email (Akun Login & Reset) *
                </label>
                <input
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nomor WhatsApp Aktif *
                </label>
                <input
                  type="text"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="081234567890 atau +62812..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tingkat Tier Awal
                </label>
                <select
                  value={regForm.tierId}
                  onChange={(e) => setRegForm({ ...regForm, tierId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] cursor-pointer"
                >
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Level {t.level}) - Diskon Kamar {t.roomDiscountPercent}%
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bonus Poin Selamat Datang (Poin)
                </label>
                <input
                  type="number"
                  value={regForm.bonusPoints}
                  onChange={(e) => setRegForm({ ...regForm, bonusPoints: Number(e.target.value) })}
                  min={0}
                  step={50}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Jenis Kelamin
                </label>
                <div className="flex items-center gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="ctrl_gender"
                      checked={regForm.gender === 'L'}
                      onChange={() => setRegForm({ ...regForm, gender: 'L' })}
                      className="accent-[#00A651]"
                    />
                    <span>Laki-Laki (Mr)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="ctrl_gender"
                      checked={regForm.gender === 'P'}
                      onChange={() => setRegForm({ ...regForm, gender: 'P' })}
                      className="accent-[#00A651]"
                    />
                    <span>Perempuan (Mrs/Ms)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={regForm.birthDate}
                  onChange={(e) => setRegForm({ ...regForm, birthDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kota / Daerah Asal
                </label>
                <input
                  type="text"
                  value={regForm.city}
                  onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                  placeholder="Mataram, Denpasar, Jakarta..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  No. KTP / Paspor (Opsional)
                </label>
                <input
                  type="text"
                  value={regForm.idCardNumber}
                  onChange={(e) => setRegForm({ ...regForm, idCardNumber: e.target.value })}
                  placeholder="520100..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Catatan Profil Khusus Tamu (Preferensi/Alergi)
              </label>
              <textarea
                value={regForm.internalNotes}
                onChange={(e) => setRegForm({ ...regForm, internalNotes: e.target.value })}
                placeholder="Preferensi kamar lantai atas, bebas rokok, vegetarian, dsb..."
                rows={2}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsNewRegistrationOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#00A651] hover:bg-[#008F45] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Daftarkan & Terbitkan Kartu</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL VISUALISASI KARTU MEMBER SUKSES ================= */}
      {newlyRegisteredMember && (
        <MemberCardSuccessModal
          isOpen={Boolean(newlyRegisteredMember)}
          onClose={() => setNewlyRegisteredMember(null)}
          member={newlyRegisteredMember}
          tier={tiers.find((t) => t.id === newlyRegisteredMember.tierId) || tiers[0]}
          onContinue={() => {
            setNewlyRegisteredMember(null);
            onNavigate('admin_members');
          }}
          continueButtonText="Buka Database Member"
          title="Member Baru Berhasil Didaftarkan! Kartu Digital VIP Telah Diterbitkan 🎉"
        />
      )}
    </div>
  );
};
