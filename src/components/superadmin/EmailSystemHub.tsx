import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { EmailSystemConfig, EmailMessageLog } from '../../types';
import { formatDateIndo, formatIDR } from '../../services/membershipEngine';
import {
  fetchServerEmailLogs,
  fetchServerEmailStats,
} from '../../services/emailService';
import {
  checkBackendConnection,
  CLOUD_RUN_PREVIEW_URL,
  isNativeCloudRunHost,
} from '../../services/apiClient';
import {
  Mail,
  Send,
  Settings,
  Server,
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileText,
  Clock,
  ExternalLink,
  Sparkles,
  Save,
  Check,
  UserCheck,
  Activity,
  RotateCcw,
  Search,
  Filter,
  Download,
  Trash2,
  Terminal,
  Copy,
  Zap,
  Award,
  Users,
  X,
  Radio,
  ChevronDown,
} from 'lucide-react';

interface EmailSystemHubProps {
  onNavigate?: (tab: string) => void;
}

export const EmailSystemHub: React.FC<EmailSystemHubProps> = ({ onNavigate }) => {
  const {
    emailConfig,
    emailLogs,
    updateEmailConfig,
    sendTestEmailToRecipient,
    resendEmailNotification,
    clearEmailLogs,
    sendMemberNotificationEmail,
    sendMemberTierUpgradeEmail,
    sendMemberPointsEmail,
    members,
    tiers,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'tracker' | 'settings' | 'test' | 'templates'>('tracker');

  // Form State for Email Settings
  const [formConfig, setFormConfig] = useState<EmailSystemConfig>({ ...emailConfig });

  // Test connection state
  const [testEmail, setTestEmail] = useState('edp.logar@gmail.com');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    responseTimeMs?: number;
  } | null>(null);

  // Template preview mode
  const [previewTemplate, setPreviewTemplate] = useState<'welcome' | 'reset'>('welcome');

  // --- REAL-TIME STATUS TRACKER STATE ---
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'failed' | 'sent' | 'queued'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailMessageLog | null>(null);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct Member Notification Dispatch Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchMemberId, setDispatchMemberId] = useState<string>('');
  const [dispatchType, setDispatchType] = useState<'welcome' | 'tier_upgrade' | 'points' | 'custom'>('custom');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customRecipientEmail, setCustomRecipientEmail] = useState('');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Real-time polling listener
  useEffect(() => {
    if (!isAutoSync) return;

    const interval = setInterval(async () => {
      try {
        const serverLogs = await fetchServerEmailLogs();
        if (serverLogs.length > 0) {
          // Merge server logs with local logs
          setLastSyncTime(new Date());
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoSync]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchServerEmailLogs();
      setLastSyncTime(new Date());
      showToast('Data status pengiriman email berhasil disinkronkan.', 'info');
    } catch {
      showToast('Gagal menyinkronkan data status server.', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmailConfig(formConfig);
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      showToast('Alamat email penerima uji coba wajib diisi.', 'error');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const startTime = Date.now();
    const result = await sendTestEmailToRecipient(testEmail.trim());
    const duration = Date.now() - startTime;

    setIsTesting(false);
    setTestResult({
      success: result.success,
      message: result.message,
      responseTimeMs: duration,
    });
  };

  const handleRetryDispatch = async (logId: string) => {
    setIsRetryingId(logId);
    try {
      const res = await resendEmailNotification(logId);
      if (res.success && selectedLog && selectedLog.id === logId) {
        setSelectedLog((prev) => prev ? { ...prev, status: 'delivered', errorMessage: undefined, retryCount: (prev.retryCount || 0) + 1 } : null);
      }
    } finally {
      setIsRetryingId(null);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(emailLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `email_dispatch_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Log pengiriman email berhasil diunduh.', 'success');
  };

  const handleSendMemberNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingNotification(true);

    try {
      const targetMember = members.find((m) => m.id === dispatchMemberId);
      const email = targetMember ? targetMember.email : customRecipientEmail.trim();
      const name = targetMember ? targetMember.fullName : customRecipientName.trim() || 'Member VIP';

      if (!email) {
        showToast('Alamat email penerima wajib diisi.', 'error');
        setIsSendingNotification(false);
        return;
      }

      if (dispatchType === 'welcome') {
        if (!targetMember) {
          showToast('Pilih member terdaftar untuk mengirim template sambutan.', 'error');
          setIsSendingNotification(false);
          return;
        }
        const memberTier = tiers.find((t) => t.id === targetMember.tierId) || tiers[0];
        // Trigger welcome notification
        await sendMemberNotificationEmail(
          targetMember.email,
          targetMember.fullName,
          `Selamat Bergabung di Lombok Garden Hotel (${targetMember.membershipNumber})`,
          `Halo ${targetMember.fullName},\n\nKartu digital membership Anda telah aktif dengan nomor ${targetMember.membershipNumber} (Tier: ${memberTier.name}). Gunakan email ${targetMember.email} untuk mengakses portal membership resmi.\n\nSalam hangat,\nLombok Garden Hotel Concierge`,
          targetMember.membershipNumber
        );
      } else if (dispatchType === 'tier_upgrade') {
        if (!targetMember) {
          showToast('Pilih member terdaftar untuk template kenaikan tier.', 'error');
          setIsSendingNotification(false);
          return;
        }
        const currentTier = tiers.find((t) => t.id === targetMember.tierId) || tiers[0];
        const nextTier = tiers.find((t) => t.level === (currentTier.level || 1) + 1) || tiers[tiers.length - 1];
        await sendMemberTierUpgradeEmail(targetMember, currentTier, nextTier);
      } else if (dispatchType === 'points') {
        if (!targetMember) {
          showToast('Pilih member terdaftar untuk template poin.', 'error');
          setIsSendingNotification(false);
          return;
        }
        await sendMemberPointsEmail(targetMember, 150, (targetMember.availablePoints || 0) + 150, 'Bonus Menginap Spesial');
      } else {
        // Custom announcement
        if (!customSubject.trim() || !customMessage.trim()) {
          showToast('Subjek dan isi pesan email wajib diisi.', 'error');
          setIsSendingNotification(false);
          return;
        }
        await sendMemberNotificationEmail(
          email,
          name,
          customSubject.trim(),
          customMessage.trim(),
          targetMember?.membershipNumber
        );
      }

      setIsDispatchModalOpen(false);
      setCustomSubject('');
      setCustomMessage('');
      setActiveTab('tracker');
    } catch {
      showToast('Gagal mengirimkan notifikasi email.', 'error');
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    return emailLogs.filter((log) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'failed' && log.status !== 'failed' && !log.errorMessage) return false;
        if (statusFilter === 'delivered' && log.status !== 'delivered') return false;
        if (statusFilter === 'sent' && log.status !== 'sent') return false;
        if (statusFilter === 'queued' && log.status !== 'queued') return false;
      }

      // Type filter
      if (typeFilter !== 'all' && log.type !== typeFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEmail = log.recipientEmail.toLowerCase().includes(q);
        const matchName = log.recipientName.toLowerCase().includes(q);
        const matchSubj = log.subject.toLowerCase().includes(q);
        const matchMemberNo = log.membershipNumber?.toLowerCase().includes(q);
        const matchErr = log.errorMessage?.toLowerCase().includes(q);
        const matchToken = log.otpCode?.includes(q) || log.resetToken?.includes(q);
        return matchEmail || matchName || matchSubj || matchMemberNo || matchErr || matchToken;
      }

      return true;
    });
  }, [emailLogs, statusFilter, typeFilter, searchQuery]);

  // Statistics calculation
  const totalCount = emailLogs.length;
  const deliveredCount = emailLogs.filter((l) => l.status === 'delivered').length;
  const failedCount = emailLogs.filter((l) => l.status === 'failed' || !!l.errorMessage).length;
  const sentCount = emailLogs.filter((l) => l.status === 'sent').length;
  const successRate = totalCount > 0 ? Math.round(((totalCount - failedCount) / totalCount) * 100) : 100;
  const avgLatency = totalCount > 0
    ? Math.round(emailLogs.reduce((acc, l) => acc + (l.latencyMs || 150), 0) / totalCount)
    : 140;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Super Admin Control
            </span>
            <span className="text-xs text-stone-400">·</span>
            <span className="text-xs text-stone-500 font-mono">SMTP & Email Gateway</span>
            <span className="text-xs text-stone-400">·</span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Tracker Active</span>
            </div>
          </div>
          <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            Pusat Pengaturan Email & Status Tracker
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Pelacak status pengiriman email notifikasi member secara real-time, log error SMTP, pengujian koneksi, dan konfigurasi reset kata sandi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDispatchModalOpen(true)}
            className="px-4 py-2 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Notifikasi Member</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-700" />
            <span>Uji Gateway</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs font-semibold overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'tracker'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Pelacak Status Real-Time ({emailLogs.length})</span>
          {failedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {failedCount} Error
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Email & SMTP</span>
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'test'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Uji Coba Koneksi</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Template & Desain Email</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB: REAL-TIME STATUS TRACKER & ERROR LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Top Real-Time Control & Status Pulse Bar */}
          <div className="p-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl border border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wide uppercase text-emerald-400">
                    Live Member Email Dispatch Tracker
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                    Host: {emailConfig.smtpHost}:{emailConfig.smtpPort}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                  <span>Sinkronisasi otomatis aktif</span>
                  <span>·</span>
                  <span className="font-mono">Terakhir diperbarui: {lastSyncTime.toLocaleTimeString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setIsAutoSync(!isAutoSync)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  isAutoSync
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400'
                }`}
                title="Aktifkan/Nonaktifkan Auto Refresh"
              >
                <Radio className={`w-3.5 h-3.5 ${isAutoSync ? 'text-emerald-400 animate-pulse' : ''}`} />
                <span>{isAutoSync ? 'Auto-Sync: ON (4s)' : 'Auto-Sync: PAUSED'}</span>
              </button>

              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>

              <button
                onClick={handleExportLogs}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export JSON</span>
              </button>

              {emailLogs.length > 0 && (
                <button
                  onClick={clearEmailLogs}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-800"
                  title="Bersihkan semua log"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Bersihkan</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-time KPI Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Dispatched */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Total Notifikasi
              </span>
              <div className="text-2xl font-serif font-bold text-stone-900">
                {totalCount}
              </div>
              <p className="text-[10px] text-stone-400">Total email tercatat di antrean sistem</p>
            </div>

            {/* Success Rate */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Success Rate
                </span>
                <span className="text-[11px] font-bold text-emerald-700 font-mono">
                  {successRate}%
                </span>
              </div>
              <div className="text-2xl font-serif font-bold text-[#00A651]">
                {successRate}%
              </div>
              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#00A651] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>

            {/* Delivered (Success) */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Delivered
              </span>
              <div className="text-2xl font-serif font-bold text-emerald-700">
                {deliveredCount}
              </div>
              <p className="text-[10px] text-emerald-800/70">SMTP Handshake OK (250)</p>
            </div>

            {/* Errors / Failed */}
            <div
              className={`p-4 rounded-2xl border shadow-xs space-y-1 transition-all ${
                failedCount > 0
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-white border-stone-200'
              }`}
            >
              <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Error / Failed
              </span>
              <div className={`text-2xl font-serif font-bold ${failedCount > 0 ? 'text-rose-600' : 'text-stone-400'}`}>
                {failedCount}
              </div>
              <p className="text-[10px] text-rose-700/80">
                {failedCount > 0 ? 'Perlu tindakan perbaikan' : 'Nol kegagalan pengiriman'}
              </p>
            </div>

            {/* Avg Response Time */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Rata-rata Latensi
              </span>
              <div className="text-2xl font-serif font-bold text-stone-900 font-mono">
                {avgLatency} <span className="text-xs font-normal text-stone-500">ms</span>
              </div>
              <p className="text-[10px] text-stone-400">Kecepatan gateway SMTP</p>
            </div>
          </div>

          {/* Active Error Alert Banner if any failed logs */}
          {failedCount > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Terdeteksi {failedCount} email gagal terkirim atau mengalami kendala handshake SMTP.
                  </div>
                  <div className="text-[11px] text-rose-800 mt-0.5">
                    Klik tombol <strong>Detail & Error Log</strong> pada baris terkait untuk melihat kode error spesifik, log diagnosa server, atau lakukan <strong>Kirim Ulang (Retry)</strong> setelah memeriksa password SMTP.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter('failed')}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-xs"
              >
                Tampilkan Hanya Error
              </button>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari email penerima, nama member, no member (LGH-...), subjek, atau error log..."
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center flex-wrap gap-1.5 text-xs font-semibold">
                <span className="text-[11px] text-stone-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Semua ({emailLogs.length})
                </button>
                <button
                  onClick={() => setStatusFilter('delivered')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'delivered'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Delivered ({deliveredCount})
                </button>
                <button
                  onClick={() => setStatusFilter('failed')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'failed'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Failed / Error ({failedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('sent')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'sent'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Sent ({sentCount})
                </button>
              </div>
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-stone-100 text-xs">
              <span className="text-[11px] text-stone-400 mr-1">Tipe Email:</span>
              {[
                { id: 'all', label: 'Semua Tipe' },
                { id: 'welcome', label: 'Member Baru (Welcome)' },
                { id: 'password_reset', label: 'Reset Kata Sandi (OTP)' },
                { id: 'tier_upgrade', label: 'Kenaikan Tier' },
                { id: 'points_update', label: 'Pembaruan Poin' },
                { id: 'notification', label: 'Notifikasi Khusus' },
                { id: 'test', label: 'Uji Gateway (Test)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    typeFilter === t.id
                      ? 'bg-stone-800 text-white font-bold'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dispatched Logs Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-stone-50/90 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <h3 className="font-bold text-xs text-stone-800 uppercase tracking-wider">
                  Daftar Pengiriman Email & Log Status ({filteredLogs.length} item)
                </h3>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">
                Pengirim Resmi: <strong className="text-stone-800">{emailConfig.defaultSenderEmail}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">Waktu & Latensi</th>
                    <th className="px-5 py-3">Penerima & Member</th>
                    <th className="px-5 py-3">Subjek & Tipe</th>
                    <th className="px-5 py-3">Status Pengiriman</th>
                    <th className="px-5 py-3">Error / Token</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-stone-400">
                        <Mail className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                        <div className="font-bold text-stone-600">Tidak ada log pengiriman yang sesuai filter.</div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          Kirim notifikasi uji coba atau ubah filter pencarian di atas.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isFailed = log.status === 'failed' || !!log.errorMessage;
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-stone-50/80 transition-colors ${
                            isFailed ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          {/* 1. Waktu & Latensi */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-mono text-[11px] font-bold text-stone-800">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-stone-100 text-stone-600">
                              ⚡ {log.latencyMs || 140}ms
                            </span>
                          </td>

                          {/* 2. Penerima & Member */}
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{log.recipientName}</span>
                              {log.membershipNumber && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900">
                                  {log.membershipNumber}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-emerald-700 truncate max-w-xs">
                              {log.recipientEmail}
                            </div>
                            {log.retryCount ? (
                              <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                                <RotateCcw className="w-2.5 h-2.5 text-amber-600" />
                                <span>Retried {log.retryCount}x</span>
                              </span>
                            ) : null}
                          </td>

                          {/* 3. Subjek & Tipe */}
                          <td className="px-5 py-3.5 max-w-sm">
                            <div className="font-medium text-stone-800 truncate" title={log.subject}>
                              {log.subject}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold font-mono ${
                                  log.type === 'welcome'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : log.type === 'password_reset'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : log.type === 'tier_upgrade'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : log.type === 'points_update'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {log.type === 'welcome'
                                  ? 'Member Baru'
                                  : log.type === 'password_reset'
                                  ? 'Reset Password'
                                  : log.type === 'tier_upgrade'
                                  ? 'Upgrade Tier'
                                  : log.type === 'points_update'
                                  ? 'Update Poin'
                                  : log.type}
                              </span>
                              {log.previewText && (
                                <span className="text-[10px] text-stone-400 truncate hidden sm:inline" title={log.previewText}>
                                  · {log.previewText}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Status Pengiriman */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {isFailed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>FAILED / ERROR</span>
                              </span>
                            ) : log.status === 'delivered' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>DELIVERED (250)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200">
                                <Send className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>SENT / QUEUED</span>
                              </span>
                            )}
                          </td>

                          {/* 5. Error / Token OTP */}
                          <td className="px-5 py-3.5 max-w-xs">
                            {log.errorMessage ? (
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-bold text-rose-700 font-mono truncate" title={log.errorMessage}>
                                  {log.errorCode ? `[${log.errorCode}] ` : ''}{log.errorMessage}
                                </div>
                                <div className="text-[9px] text-rose-500">
                                  Klik detail untuk periksa stack log
                                </div>
                              </div>
                            ) : log.otpCode ? (
                              <div className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                OTP: {log.otpCode}
                              </div>
                            ) : log.resetToken ? (
                              <span className="text-[10px] text-stone-500 font-mono">Token Aktif</span>
                            ) : (
                              <span className="text-stone-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* 6. Aksi */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Lihat Detail & Error Log"
                              >
                                <Eye className="w-3.5 h-3.5 text-stone-500" />
                                <span>Detail</span>
                              </button>

                              <button
                                onClick={() => handleRetryDispatch(log.id)}
                                disabled={isRetryingId === log.id}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="Kirim Ulang Notifikasi"
                              >
                                <RotateCcw className={`w-3 h-3 text-emerald-600 ${isRetryingId === log.id ? 'animate-spin' : ''}`} />
                                <span>{isRetryingId === log.id ? 'Mengirim...' : 'Kirim Ulang'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL & ERROR LOG INSPECTOR */}
      {/* ========================================================================= */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Inspeksi Log Pengiriman & Status Error
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 flex-1">
              {/* Status Header Badge */}
              <div className="p-4 rounded-2xl border flex items-center justify-between gap-3 bg-stone-50 border-stone-200">
                <div className="flex items-center gap-3">
                  {selectedLog.errorMessage || selectedLog.status === 'failed' ? (
                    <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      {selectedLog.errorMessage ? 'Pengiriman Menemui Masalah (Failed/Error)' : 'Pengiriman Berhasil (Delivered)'}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      SMTP Host: {selectedLog.smtpHost || emailConfig.smtpHost} · Latensi: {selectedLog.latencyMs || 140}ms
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRetryDispatch(selectedLog.id)}
                  disabled={isRetryingId === selectedLog.id}
                  className="px-3.5 py-1.5 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRetryingId === selectedLog.id ? 'animate-spin' : ''}`} />
                  <span>Kirim Ulang Sekarang</span>
                </button>
              </div>

              {/* Error Stack Diagnostic Box (if any error) */}
              {selectedLog.errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Detail Pesan Error & Solusi Diagnostik:
                    </span>
                    <button
                      onClick={() => handleCopyText(selectedLog.rawError || selectedLog.errorMessage || '', 'err_copy')}
                      className="text-[10px] text-rose-700 hover:text-rose-900 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'err_copy' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Salin Error</span>
                    </button>
                  </div>

                  <div className="p-3 bg-stone-900 text-rose-300 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-stone-800">
                    {selectedLog.rawError || selectedLog.errorMessage}
                  </div>

                  <div className="text-[11px] text-rose-800 leading-normal pt-1">
                    <strong>Rekomendasi Tindakan:</strong> Pastikan kredensial SMTP (Username dan App Password) terisi valid di tab <em>Pengaturan Email & SMTP</em>, atau periksa batasan kuota pengirim dari penyedia email.
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-medium uppercase">Penerima (Recipient):</span>
                  <div className="font-bold text-stone-900 mt-0.5">{selectedLog.recipientName}</div>
                  <div className="font-mono text-emerald-700">{selectedLog.recipientEmail}</div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-medium uppercase">Pengirim Resmi (Sender):</span>
                  <div className="font-bold text-stone-900 mt-0.5">{emailConfig.defaultSenderName}</div>
                  <div className="font-mono text-stone-600">{selectedLog.senderEmail || emailConfig.defaultSenderEmail}</div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-medium uppercase">Subjek Email:</span>
                  <div className="font-medium text-stone-800 mt-0.5">{selectedLog.subject}</div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-medium uppercase">Waktu Pengiriman:</span>
                  <div className="font-mono text-stone-800 mt-0.5">
                    {new Date(selectedLog.timestamp).toLocaleString('id-ID')}
                  </div>
                </div>

                {selectedLog.otpCode && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 sm:col-span-2">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase">Kode OTP Keamanan Terbit:</span>
                    <div className="text-xl font-mono font-bold text-emerald-900 tracking-widest mt-0.5">
                      {selectedLog.otpCode}
                    </div>
                  </div>
                )}

                {selectedLog.deliveryDetails?.smtpResponse && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 sm:col-span-2">
                    <span className="text-[10px] text-stone-400 font-medium uppercase">SMTP Handshake Response:</span>
                    <div className="font-mono text-[11px] text-stone-700 mt-0.5">
                      {selectedLog.deliveryDetails.smtpResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 flex justify-end bg-stone-50 rounded-b-3xl">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DIRECT MEMBER NOTIFICATION DISPATCHER */}
      {/* ========================================================================= */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#00A651]/10 text-[#00A651]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Kirim Notifikasi Email ke Member
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Kirimkan notifikasi langsung dan pantau statusnya secara real-time di tracker
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMemberNotification} className="p-6 space-y-4 flex-1">
              {/* Notification Template Type */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pilih Jenis Notifikasi *
                </label>
                <select
                  value={dispatchType}
                  onChange={(e: any) => setDispatchType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                >
                  <option value="custom">Notifikasi / Pengumuman Kustom</option>
                  <option value="welcome">Email Sambutan & Kartu Digital Member Baru</option>
                  <option value="tier_upgrade">Notifikasi Kenaikan Tingkat (Tier Upgrade)</option>
                  <option value="points">Pemberitahuan Penambahan Poin Loyalitas</option>
                </select>
              </div>

              {/* Target Member Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pilih Member Penerima Terdaftar (Opsional)
                </label>
                <select
                  value={dispatchMemberId}
                  onChange={(e) => {
                    setDispatchMemberId(e.target.value);
                    const selected = members.find((m) => m.id === e.target.value);
                    if (selected) {
                      setCustomRecipientEmail(selected.email);
                      setCustomRecipientName(selected.fullName);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                >
                  <option value="">-- Masukkan Email Bebas Manual --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.membershipNumber}) - {m.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Email & Name if custom or manual */}
              {!dispatchMemberId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Email Penerima *
                    </label>
                    <input
                      type="email"
                      value={customRecipientEmail}
                      onChange={(e) => setCustomRecipientEmail(e.target.value)}
                      placeholder="tamu@example.com"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00A651]"
                      required={!dispatchMemberId}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nama Penerima *
                    </label>
                    <input
                      type="text"
                      value={customRecipientName}
                      onChange={(e) => setCustomRecipientName(e.target.value)}
                      placeholder="Bpk. Rahmat Hidayat"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                      required={!dispatchMemberId}
                    />
                  </div>
                </div>
              )}

              {/* Custom Subject & Message if custom */}
              {dispatchType === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Subjek Email *
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Penawaran Eksklusif Weekend di Lombok Garden Hotel"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Isi Pesan Notifikasi *
                    </label>
                    <textarea
                      rows={5}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Tuliskan pesan notifikasi resmi untuk member..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                      required
                    />
                  </div>
                </>
              )}

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-500">
                Pengirim: <strong>{emailConfig.defaultSenderName}</strong> ({emailConfig.defaultSenderEmail})
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSendingNotification}
                  className="px-5 py-2.5 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSendingNotification ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Notifikasi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: SETTINGS (Pengaturan Email & SMTP) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Section A: Sender Identity */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Mail className="w-4 h-4 text-[#00A651]" />
              <h3 className="font-bold text-sm text-stone-900">
                Identitas Default Email Pengirim (Sender Identity)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Default Email Pengirim Resmi *
                </label>
                <input
                  type="email"
                  value={formConfig.defaultSenderEmail}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, defaultSenderEmail: e.target.value })
                  }
                  placeholder="membership@lombokgardenhotel.com atau edp.logar@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Alamat email yang akan muncul sebagai pengirim (From Address) pada email member baru dan reset password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Tampilan Pengirim (Sender Display Name) *
                </label>
                <input
                  type="text"
                  value={formConfig.defaultSenderName}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, defaultSenderName: e.target.value })
                  }
                  placeholder="Lombok Garden Hotel Concierge"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Alamat Balasan (Reply-To Email)
                </label>
                <input
                  type="email"
                  value={formConfig.replyToEmail}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, replyToEmail: e.target.value })
                  }
                  placeholder="guestservice@lombokgardenhotel.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Penyedia Layanan (Service Provider)
                </label>
                <select
                  value={formConfig.provider}
                  onChange={(e: any) =>
                    setFormConfig({ ...formConfig, provider: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                >
                  <option value="smtp">Custom SMTP Server (Direct)</option>
                  <option value="gmail">Google Gmail SMTP / Workspace</option>
                  <option value="sendgrid">SendGrid API / SMTP</option>
                  <option value="resend">Resend / Mailgun</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section B: SMTP Server Configuration */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Server className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-sm text-stone-900">
                Konfigurasi Server SMTP & Kredensial Otentikasi
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  SMTP Host Server *
                </label>
                <input
                  type="text"
                  value={formConfig.smtpHost}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, smtpHost: e.target.value })
                  }
                  placeholder="smtp.gmail.com atau mail.lombokgardenhotel.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  SMTP Port *
                </label>
                <input
                  type="number"
                  value={formConfig.smtpPort}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, smtpPort: parseInt(e.target.value) || 587 })
                  }
                  placeholder="587 / 465"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  SMTP Username / Email Akun *
                </label>
                <input
                  type="text"
                  value={formConfig.smtpUser}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, smtpUser: e.target.value })
                  }
                  placeholder="edp.logar@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  SMTP Password / App Password
                </label>
                <input
                  type="password"
                  value={formConfig.smtpPassword || ''}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, smtpPassword: e.target.value })
                  }
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00A651]"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Untuk Gmail, gunakan <em>16-digit App Password</em> dari Google Account Security.
                </p>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={formConfig.smtpSecure}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, smtpSecure: e.target.checked })
                    }
                    className="w-4 h-4 text-[#00A651] rounded focus:ring-[#00A651]/20"
                  />
                  <span>Gunakan Koneksi Aman SSL/TLS (Port 465)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section C: Automation Triggers */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-stone-900">
                Pemicu Otomatisasi Pengiriman Email
              </h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/60 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.autoSendWelcomeEmail}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      autoSendWelcomeEmail: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#00A651] rounded focus:ring-[#00A651]/20 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Kirim Email Sambutan & Kartu Digital Otomatis saat Member Baru Terdaftar
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Setiap kali member baru mendaftar (mandiri atau didaftarkan staf), sistem langsung mengirimkan kartu keanggotaan digital dan mengonfirmasi email terdaftar sebagai syarat login & reset password.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/60 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.autoSendPasswordResetEmail}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      autoSendPasswordResetEmail: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#00A651] rounded focus:ring-[#00A651]/20 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Aktifkan Layanan Pengiriman Tautan & OTP Reset Kata Sandi via Email Terdaftar
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Mengirimkan instruksi pemulihan aman dengan token 60 menit dan kode OTP ke alamat email terdaftar member saat meminta reset kata sandi.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Terapkan Konfigurasi Email</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB: TEST CONNECTION */}
      {/* ========================================================================= */}
      {activeTab === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                <Send className="w-4 h-4 text-[#00A651]" />
                <h3 className="font-bold text-sm text-stone-900">
                  Uji Coba Pengiriman Email Verifikasi
                </h3>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Kirimkan email uji coba untuk memverifikasi bahwa konfigurasi email pengirim default <strong>{emailConfig.defaultSenderEmail}</strong> dan server SMTP <strong>{emailConfig.smtpHost}:{emailConfig.smtpPort}</strong> dapat menjangkau kotak masuk member dengan lancar.
              </p>

              <form onSubmit={handleRunTest} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alamat Email Tujuan Uji Coba *
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="edp.logar@gmail.com atau email Anda"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Menghubungi Server SMTP & Mengirim Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>Kirim Email Verifikasi Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-5 rounded-2xl border shadow-xs animate-in fade-in duration-200 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <div className="font-bold text-sm">
                      {testResult.success ? 'Hasil Pengujian: Berhasil' : 'Hasil Pengujian: Gagal'}
                    </div>
                    <div className="text-xs leading-relaxed opacity-90">
                      {testResult.message}
                    </div>
                    {testResult.responseTimeMs && (
                      <div className="text-[11px] font-mono opacity-75 pt-1">
                        Waktu Respons: {testResult.responseTimeMs} ms
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Summary Card */}
          <div className="lg:col-span-6">
            <div className="p-6 bg-gradient-to-br from-[#072417] via-[#0A3320] to-[#04160E] text-white rounded-2xl border border-[#0E4029] shadow-md space-y-4">
              <div className="text-[10px] font-mono text-[#C5A869] uppercase tracking-widest font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A869] animate-pulse" />
                STATUS GATEWAY EMAIL AKTIF
              </div>

              <div>
                <div className="text-xs text-emerald-200/80">Default Sender Address:</div>
                <div className="font-mono text-base font-bold text-white mt-0.5">
                  {emailConfig.defaultSenderEmail}
                </div>
                <div className="text-xs text-emerald-300/90 font-medium">
                  {emailConfig.defaultSenderName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-900/80 text-xs">
                <div>
                  <span className="text-emerald-300/70 text-[11px]">SMTP Host:</span>
                  <div className="font-mono text-white font-bold">{emailConfig.smtpHost}</div>
                </div>
                <div>
                  <span className="text-emerald-300/70 text-[11px]">Port:</span>
                  <div className="font-mono text-white font-bold">{emailConfig.smtpPort}</div>
                </div>
                <div>
                  <span className="text-emerald-300/70 text-[11px]">User:</span>
                  <div className="font-mono text-white font-bold truncate">{emailConfig.smtpUser}</div>
                </div>
                <div>
                  <span className="text-emerald-300/70 text-[11px]">Keamanan:</span>
                  <div className="font-mono text-white font-bold">
                    {emailConfig.smtpSecure ? 'SSL / TLS' : 'STARTTLS (587)'}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-900/80 space-y-1.5 text-xs text-emerald-200/90">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00A651]" />
                  <span>Email Sambutan Member Baru: <strong>{emailConfig.autoSendWelcomeEmail ? 'Aktif' : 'Nonaktif'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00A651]" />
                  <span>Reset Password via Email: <strong>{emailConfig.autoSendPasswordResetEmail ? 'Aktif' : 'Nonaktif'}</strong></span>
                </div>
              </div>
            </div>

            {/* Subdomain & Cloud Run Bridge Status Card */}
            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                    Jembatan API Subdomain Live Web
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-Routing Aktif</span>
                </span>
              </div>

              <p className="text-[11px] text-stone-600 leading-relaxed">
                Aplikasi dilengkapi fitur <strong>Multi-Host Fallback</strong> otomatis. Jika aplikasi diakses via subdomain kustom (seperti <em>member.lombokgardenhotel.com</em>) yang di-host di server statis tanpa Node.js, seluruh panggilan API email & WhatsApp otomatis dialihkan ke backend Cloud Run resmi yang aktif 24/7.
              </p>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Domain Browser Aktif:</span>
                  <span className="font-mono font-semibold text-stone-800">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://member.lombokgardenhotel.com'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Cloud Run Backend Gateway:</span>
                  <span className="font-mono text-[11px] text-emerald-700 truncate max-w-[200px]" title={CLOUD_RUN_PREVIEW_URL}>
                    {CLOUD_RUN_PREVIEW_URL.replace('https://', '')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Tipe Akses:</span>
                  <span className="font-semibold text-stone-700">
                    {!isNativeCloudRunHost() ? 'Custom Subdomain (Auto-Bridge ke Cloud Run)' : 'Direct AI Studio Host'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: TEMPLATES & PREVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewTemplate('welcome')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                previewTemplate === 'welcome'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              Template 1: Email Sambutan Member Baru & Kartu Digital
            </button>

            <button
              onClick={() => setPreviewTemplate('reset')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                previewTemplate === 'reset'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              Template 2: Instruksi & Kode OTP Reset Kata Sandi
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Template Editor */}
            <div className="lg:col-span-5 p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-stone-900">
                {previewTemplate === 'welcome'
                  ? 'Kustomisasi Teks Email Sambutan'
                  : 'Kustomisasi Teks Email Reset Password'}
              </h3>

              {previewTemplate === 'welcome' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Subjek Email
                    </label>
                    <input
                      type="text"
                      value={formConfig.welcomeSubjectTemplate}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, welcomeSubjectTemplate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Isi Pesan Dasar (Plain Text)
                    </label>
                    <textarea
                      rows={10}
                      value={formConfig.welcomeBodyTemplate}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, welcomeBodyTemplate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono text-[11px] focus:outline-none focus:border-[#00A651]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Subjek Email
                    </label>
                    <input
                      type="text"
                      value={formConfig.resetSubjectTemplate}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, resetSubjectTemplate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Isi Pesan Dasar (Plain Text)
                    </label>
                    <textarea
                      rows={10}
                      value={formConfig.resetBodyTemplate}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, resetBodyTemplate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono text-[11px] focus:outline-none focus:border-[#00A651]"
                    />
                  </div>
                </>
              )}

              <div className="pt-2">
                <span className="text-[10px] text-stone-400 font-medium">Variabel yang didukung:</span>
                <div className="flex flex-wrap gap-1 mt-1 text-[10px] font-mono text-stone-600">
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{'{{fullName}}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{'{{email}}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{'{{membershipNumber}}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{'{{tierName}}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{'{{cardUrl}}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{'{{otpCode}}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">{'{{resetUrl}}'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Simpan Perubahan Template
              </button>
            </div>

            {/* Live Visual Preview */}
            <div className="lg:col-span-7 p-6 bg-stone-100 rounded-2xl border border-stone-300 shadow-inner flex flex-col items-center justify-center">
              <div className="text-xs font-bold text-stone-500 mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Pratinjau Tampilan Email di Kotak Masuk Member (HTML Visual)</span>
              </div>

              {/* Mock Email Frame */}
              <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden text-stone-900">
                {/* Email Header */}
                <div className="p-5 bg-gradient-to-br from-[#072417] via-[#0A3320] to-[#04160E] text-white text-center">
                  <div className="inline-block bg-white text-[#072417] px-3 py-1 rounded-lg text-xs font-serif font-bold tracking-wider mb-2">
                    LOMBOK GARDEN HOTEL
                  </div>
                  <div className="text-[10px] text-[#C5A869] font-bold tracking-widest uppercase">
                    Hospitality & Membership
                  </div>
                  <h4 className="font-serif text-base mt-2 font-normal text-white">
                    {previewTemplate === 'welcome'
                      ? 'Selamat Bergabung, Bpk. Rahmat Hidayat'
                      : 'Instruksi Reset Kata Sandi'}
                  </h4>
                </div>

                {/* Email Body */}
                <div className="p-5 space-y-4 text-xs text-stone-700">
                  {previewTemplate === 'welcome' ? (
                    <>
                      <p>
                        Terima kasih telah bergabung di program keanggotaan resmi <strong>Lombok Garden Hotel</strong>. Kartu digital Anda telah aktif:
                      </p>

                      <div className="p-3.5 bg-[#FAF9F5] border border-[#E5DFD3] rounded-xl space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase">No. Member:</span>
                            <div className="font-mono text-sm font-bold text-[#00A651]">LGH-2024-0012</div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Gold Tier
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span>Email Terdaftar: <strong>rahmat@gmail.com</strong></span>
                          <span className="text-amber-700 font-bold">+100 Poin</span>
                        </div>
                      </div>

                      <div className="text-center pt-2">
                        <span className="inline-block px-5 py-2.5 bg-[#00A651] text-white font-bold text-xs rounded-xl shadow-xs">
                          Buka Kartu Membership Digital
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        Kami menerima permintaan untuk mereset kata sandi akun member Anda yang terdaftar pada email: <strong>rahmat@gmail.com</strong>.
                      </p>

                      <div className="p-4 bg-[#FAF9F5] border border-[#E5DFD3] rounded-xl text-center space-y-1">
                        <div className="text-[10px] text-stone-500 uppercase font-bold">Kode OTP Verifikasi:</div>
                        <div className="text-2xl font-mono font-bold text-[#00A651] tracking-widest">748921</div>
                        <div className="text-[10px] text-stone-400">Berlaku 60 menit</div>
                      </div>

                      <div className="text-center pt-2">
                        <span className="inline-block px-5 py-2.5 bg-[#00A651] text-white font-bold text-xs rounded-xl shadow-xs">
                          Atur Ulang Kata Sandi Sekarang
                        </span>
                      </div>
                    </>
                  )}

                  <div className="pt-3 border-t border-stone-100 text-[10px] text-stone-400 text-center">
                    Lombok Garden Hotel · Jl. Bung Karno No. 7, Mataram · (0370) 636015
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
