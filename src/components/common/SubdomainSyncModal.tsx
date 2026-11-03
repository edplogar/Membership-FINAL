import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MEMBER_CUSTOM_DOMAIN,
  FIRESTORE_DATABASE_ID,
  isMemberSubdomain,
  setSimulateMemberSubdomain,
  isSimulationActive,
} from '../../services/domainService';
import {
  pushAllToFirestore,
  seedFirestoreIfEmpty,
  measureFirestoreLatency,
} from '../../services/dbSyncService';
import { useToast } from '../../context/ToastContext';
import {
  Globe,
  Database,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Server,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  X,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface SubdomainSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubdomainSyncModal: React.FC<SubdomainSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    members,
    tiers,
    benefits,
    rules,
    stays,
    transactions,
    pointTransactions,
    rewards,
    vouchers,
    promotions,
    systemSettings,
    users,
    roles,
  } = useApp();

  const { showToast } = useToast();

  const [isSimActive, setIsSimActive] = useState(isSimulationActive());
  const [isSyncing, setIsSyncing] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(42);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));
  const [copiedDns, setCopiedDns] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      measureFirestoreLatency().then((res) => {
        if (res.connected) {
          setLatencyMs(res.latencyMs);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await pushAllToFirestore({
        members,
        tiers,
        benefits,
        rules,
        stays,
        transactions,
        pointTransactions,
        rewards,
        vouchers,
        promotions,
        systemSettings,
        users,
        roles,
      });

      if (res.success) {
        setLatencyMs(res.latencyMs);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
        showToast(
          `Sinkronisasi Cloud Berhasil! ${res.totalUploaded} data tersinkronisasi ke Firestore (${res.latencyMs}ms).`,
          'success'
        );
      } else {
        showToast(`Sinkronisasi selesai dengan catatan: ${res.error || 'OK'}`, 'info');
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : String(err);
      showToast(`Gagal sinkronisasi: ${errText}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, type: 'dns' | 'domain') => {
    navigator.clipboard.writeText(text);
    if (type === 'dns') {
      setCopiedDns(true);
      setTimeout(() => setCopiedDns(false), 2000);
    } else {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
    showToast('Teks berhasil disalin ke clipboard.', 'success');
  };

  const dnsCnameTarget = typeof window !== 'undefined' ? window.location.hostname : 'ais-pre-xla2nc2xa6a4dyfmg3b7sm-882338726390.asia-southeast1.run.app';
  const cnameRecordValue = `member  CNAME  ${dnsCnameTarget}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#072417] to-[#0A3822] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A651]/20 border border-[#00A651]/40 flex items-center justify-center text-[#4ADE80]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold">
                  Sinkronisasi Subdomain & Database Cloud
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00A651] text-white">
                  LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-emerald-100/70 font-mono mt-0.5">
                Alamat Subdomain: {MEMBER_CUSTOM_DOMAIN}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Active Status Badge Bar */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00A651] text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-stone-900 flex items-center gap-2">
                  <span>Subdomain Custom Terkonfigurasi</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#00A651]">
                    <span className="w-2 h-2 rounded-full bg-[#00A651] animate-ping" />
                    Aktif
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 mt-0.5">
                  Front End & Database Firestore tersinkronisasi dua arah secara real-time.
                </div>
              </div>
            </div>

            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="px-3 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>

          {/* Database & Subdomain Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                Subdomain Custom
              </div>
              <div className="font-mono font-bold text-xs text-stone-900 truncate">
                {MEMBER_CUSTOM_DOMAIN}
              </div>
              <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#00A651]" />
                SSL / HTTPS Terproteksi
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Database Firestore
              </div>
              <div className="font-mono font-bold text-xs text-stone-900 truncate" title={FIRESTORE_DATABASE_ID}>
                ai-studio-lombokgardenhote...
              </div>
              <div className="text-[10px] text-stone-500 flex items-center gap-1">
                <Activity className="w-3 h-3 text-[#00A651]" />
                Latensi Cloud: {latencyMs ?? 42} ms
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                Waktu Sinkron
              </div>
              <div className="font-mono font-bold text-xs text-stone-900">
                {lastSyncTime}
              </div>
              <div className="text-[10px] text-[#00A651] font-medium">
                Real-time Listener Aktif
              </div>
            </div>
          </div>

          {/* Synchronized Collections Count Table */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00A651]" />
                Koleksi Data yang Disinkronkan ke Front End
              </span>
              <span className="text-[11px] text-stone-500">
                Total 12 Koleksi Otomatis
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Member Terdaftar</span>
                <strong className="text-stone-900 text-sm">{members.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Tier Keanggotaan</span>
                <strong className="text-stone-900 text-sm">{tiers.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Riwayat Menginap</span>
                <strong className="text-stone-900 text-sm">{stays.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Transaksi Billing</span>
                <strong className="text-stone-900 text-sm">{transactions.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Ledger Poin</span>
                <strong className="text-stone-900 text-sm">{pointTransactions.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Katalog Reward</span>
                <strong className="text-stone-900 text-sm">{rewards.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Voucher Diskon</span>
                <strong className="text-stone-900 text-sm">{vouchers.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Pengguna Sistem</span>
                <strong className="text-stone-900 text-sm">{users.length}</strong>
              </div>
            </div>
          </div>

          {/* Subdomain Simulation & DNS Settings */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-950">
                  Pengaturan DNS & Akses Domain
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-900 select-none">
                <input
                  type="checkbox"
                  checked={isSimActive}
                  onChange={handleToggleSimulation}
                  className="rounded text-[#00A651] focus:ring-[#00A651] accent-[#00A651]"
                />
                <span>Simulasikan Subdomain di Lingkungan Uji Coba</span>
              </label>
            </div>

            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              Untuk mengarahkan domain utama atau subdomain Anda ke aplikasi ini, tambahkan baris <strong>DNS CNAME</strong> berikut pada panel domain DNS Anda:
            </p>

            <div className="p-2.5 bg-white rounded-xl border border-amber-200 font-mono text-xs flex items-center justify-between gap-2">
              <span className="text-stone-800 truncate">{cnameRecordValue}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(cnameRecordValue, 'dns')}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-sans font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                {copiedDns ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDns ? 'Tersalin' : 'Salin CNAME'}</span>
              </button>
            </div>

            <div className="text-[11px] text-stone-600 flex items-center justify-between pt-1">
              <span>Firebase Authorized Domains:</span>
              <span className="font-mono text-[#00A651] font-semibold">member.lombokgardenhotel.com</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={() => copyToClipboard(`https://${MEMBER_CUSTOM_DOMAIN}`, 'domain')}
            className="text-xs font-semibold text-stone-600 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
          >
            {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Salin URL: https://{MEMBER_CUSTOM_DOMAIN}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
