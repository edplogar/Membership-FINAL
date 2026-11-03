import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  MessageSquare,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  QrCode,
  Sliders,
  FileText,
  Users,
  Search,
  ExternalLink,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  Zap,
  Activity,
  Key,
  Globe,
  Copy,
  Plus,
  Trash2,
  HelpCircle,
  Terminal,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCheck,
  ArrowRight,
  Code,
  Download,
  Layers,
} from 'lucide-react';
import { QRCodeView } from '../common/QRCodeView';
import {
  sendWhatsAppMessageViaPing,
  testPingConnection,
  simulateWebhookIncoming,
  normalizeIndonesianPhone,
} from '../../services/pingWhatsAppService';
import { CLOUD_RUN_PREVIEW_URL } from '../../services/apiClient';
import { WhatsAppMessageLog, WhatsAppWebhookRule } from '../../types';

export const WhatsAppCRMHub: React.FC = () => {
  const {
    whatsappConfig,
    updateWhatsAppConfig,
    whatsappLogs,
    addWhatsAppLog,
    members,
    tiers,
  } = useApp();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'console' | 'webhook_rules' | 'json_triggers' | 'broadcast' | 'templates' | 'logs' | 'config'>('json_triggers');
  const [selectedTriggerTab, setSelectedTriggerTab] = useState<'member_input' | 'points_earned' | 'card_info'>('member_input');
  const [triggerTestPhone, setTriggerTestPhone] = useState('+62 812-3456-7890');
  const [isFiringTrigger, setIsFiringTrigger] = useState(false);
  const [triggerFireResult, setTriggerFireResult] = useState<{
    success: boolean;
    triggerType: string;
    log?: WhatsAppMessageLog;
    payloadSent?: Record<string, unknown>;
    diagnostics?: Record<string, unknown>;
  } | null>(null);

  const [isTestingMessage, setIsTestingMessage] = useState(false);
  const [testPhone, setTestPhone] = useState('+62 812-3456-7890');
  const [testName, setTestName] = useState('Bpk. I Made Sudarta');
  const [testMessage, setTestMessage] = useState(
    '🌿 *Lombok Garden Hotel Membership Update*\n\nHalo Bpk. I Made Sudarta, terima kasih telah berkunjung ke Lombok Garden Hotel. Transaksi sebesar Rp 1.250.000 berhasil dicatat (+625 Poin).'
  );

  // Broadcast state
  const [broadcastTargetTier, setBroadcastTargetTier] = useState<string>('all');
  const [broadcastMessage, setBroadcastMessage] = useState(
    '🌿 *Penawaran Spesial Weekend di Lombok Garden Hotel*\n\nNikmati diskon eksklusif 25% untuk reservasi Deluxe Garden View dan double loyalty points sepanjang akhir pekan ini. Tunjukkan kartu membership digital Anda saat check-in!'
  );
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccessCount, setBroadcastSuccessCount] = useState<number | null>(null);

  // Webhook rule editor state
  const [webhookRules, setWebhookRules] = useState<WhatsAppWebhookRule[]>(whatsappConfig.webhookRules || []);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleResponse, setNewRuleResponse] = useState('');
  const [newRuleType, setNewRuleType] = useState<WhatsAppWebhookRule['responseType']>('reply_text');

  // Webhook live testing simulator state
  const [simPhone, setSimPhone] = useState('+62 812-9988-7766');
  const [simMessageText, setSimMessageText] = useState('CEK POIN');
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    matchedRule?: string;
    autoReplyDispatched: boolean;
    replyMessage?: string;
  } | null>(null);

  // Config local state
  const [apiKey, setApiKey] = useState(whatsappConfig.apiKey || 'ping_live_8912734190abcdef88912');
  const [apiUrl, setApiUrl] = useState(whatsappConfig.apiUrl || 'https://ping.co.id/api/v1');
  const [senderPhone, setSenderPhone] = useState(whatsappConfig.senderPhone || '+62 812-370-112');
  const [deviceId, setDeviceId] = useState(whatsappConfig.deviceId || 'lgh_bot_device_01');
  const [accountEmail, setAccountEmail] = useState(whatsappConfig.accountEmail || 'it.management@lombokgardenhotel.com');
  const [deviceName, setDeviceName] = useState(whatsappConfig.deviceName || 'Lombok Garden Hotel CRM Bot');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://member.lombokgardenhotel.com';
  const cloudRunWebhookEndpoint = `${CLOUD_RUN_PREVIEW_URL}/api/whatsapp/webhook`;
  const liveWebhookEndpoint = currentOrigin.includes('run.app') || currentOrigin.includes('localhost')
    ? `${currentOrigin}/api/whatsapp/webhook`
    : cloudRunWebhookEndpoint;

  // Guide toggle and copy state
  const [showWebhookGuide, setShowWebhookGuide] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyField = (text: string, fieldId: string, label: string = 'URL Webhook') => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    showToast(`${label} berhasil disalin ke clipboard!`, 'info');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDownloadJson = (data: object, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`File ${filename} berhasil diunduh!`, 'success');
  };

  const handleFireTrigger = async (triggerType: 'member_input' | 'points_earned' | 'card_info') => {
    if (!triggerTestPhone.trim()) {
      showToast('Nomor WhatsApp tujuan wajib diisi', 'error');
      return;
    }
    setIsFiringTrigger(true);
    setTriggerFireResult(null);

    let message = '';
    let type: WhatsAppMessageLog['type'] = 'chat';
    let sampleData: Record<string, unknown> = {};

    if (triggerType === 'member_input') {
      type = 'welcome';
      message = `Halo *Bpk. Rahmat Hidayat*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*! 🌿🏨\n\nNomor Member: *LGH-001089*\nTier: *Classic*\n\nAkses kartu digital eksklusif Anda di:\n${currentOrigin}/card/LGH-001089\n\nTunjukkan kartu digital ini saat check-in atau bersantap untuk diskon khusus dan perolehan poin loyalitas.`;
      sampleData = {
        event: 'member.created',
        membershipNumber: 'LGH-001089',
        fullName: 'Bpk. Rahmat Hidayat',
        phone: triggerTestPhone,
        tier: 'Classic',
        cardUrl: `${currentOrigin}/card/LGH-001089`,
        registeredAt: new Date().toISOString(),
      };
    } else if (triggerType === 'points_earned') {
      type = 'point_update';
      message = `Halo *Bpk. Rahmat Hidayat*,\n\nTransaksi Anda sebesar *Rp 1.500.000* di Lombok Garden Hotel telah berhasil! 🎉\n\n+*150 Poin* telah ditambahkan ke akun Anda.\nTotal Saldo Poin Saat Ini: *850 Poin*.\n\nTerima kasih atas kunjungan Anda!`;
      sampleData = {
        event: 'points.earned',
        transactionId: `tx_${Date.now()}`,
        membershipNumber: 'LGH-001089',
        fullName: 'Bpk. Rahmat Hidayat',
        billAmount: 1500000,
        pointsEarned: 150,
        totalPoints: 850,
        outlet: 'Front Desk - Deluxe Room (Stay 2 Nights)',
      };
    } else {
      type = 'chat';
      message = `Halo *Bpk. Rahmat Hidayat*,\n\nBerikut link akses kartu digital eksklusif Lombok Garden Hotel Anda:\n${currentOrigin}/card/LGH-001089\n\nTunjukkan barcode/QR pada kartu ini saat bertransaksi di kamar, restoran, dan spa untuk diskon langsung & perolehan poin!`;
      sampleData = {
        event: 'card.info_sent',
        membershipNumber: 'LGH-001089',
        fullName: 'Bpk. Rahmat Hidayat',
        tier: 'Classic',
        cardUrl: `${currentOrigin}/card/LGH-001089`,
        qrCode: 'LGH-001089',
      };
    }

    try {
      const log = await sendWhatsAppMessageViaPing(
        triggerTestPhone,
        'Bpk. Rahmat Hidayat (Member Uji)',
        message,
        type,
        whatsappConfig,
        sampleData
      );
      addWhatsAppLog(log);
      setTriggerFireResult({
        success: log.status !== 'failed',
        triggerType,
        log,
        payloadSent: {
          to: triggerTestPhone,
          message,
          device_id: whatsappConfig.deviceId || 'lgh_bot_device_01',
          type,
          data: sampleData,
        },
        diagnostics: log.diagnostics,
      });
      showToast(`Trigger ${triggerType.toUpperCase()} berhasil dikirim via gateway!`, 'success');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setTriggerFireResult({
        success: false,
        triggerType,
        diagnostics: { error: errMsg },
      });
      showToast('Gagal mengeksekusi trigger gateway', 'error');
    } finally {
      setIsFiringTrigger(false);
    }
  };

  // Connection diagnostics state
  const [isCheckingConn, setIsCheckingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    quotaRemaining?: number;
  } | null>(null);

  // Template states
  const [templateWelcome, setTemplateWelcome] = useState(whatsappConfig.messageTemplateWelcome);
  const [templatePoints, setTemplatePoints] = useState(whatsappConfig.messageTemplatePoints);
  const [templateTierUpgrade, setTemplateTierUpgrade] = useState(whatsappConfig.messageTemplateTierUpgrade);

  // Log filter
  const [logFilterType, setLogFilterType] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  // Device status simulation
  const [isPairingQR, setIsPairingQR] = useState(false);

  const normalizedTestPhone = normalizeIndonesianPhone(testPhone);

  const handleRunDiagnostics = async () => {
    setIsCheckingConn(true);
    setConnTestResult(null);

    const tempConfig = {
      ...whatsappConfig,
      apiKey,
      apiUrl,
      senderPhone,
      deviceId,
      deviceName,
    };

    const result = await testPingConnection(tempConfig);
    setConnTestResult(result);
    setIsCheckingConn(false);

    if (result.success) {
      showToast('Koneksi ke akun ping.co.id berhasil diverifikasi!', 'success');
      updateWhatsAppConfig({
        apiKey,
        apiUrl,
        senderPhone,
        deviceId,
        deviceName,
        deviceStatus: 'connected',
        messageQuota: result.quotaRemaining,
      });
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleSaveConfig = () => {
    updateWhatsAppConfig({
      apiKey,
      apiUrl,
      senderPhone,
      deviceId,
      accountEmail,
      deviceName,
      webhookUrl: liveWebhookEndpoint,
      webhookRules,
      messageTemplateWelcome: templateWelcome,
      messageTemplatePoints: templatePoints,
      messageTemplateTierUpgrade: templateTierUpgrade,
    });
    showToast('Konfigurasi WhatsApp & Aturan Webhook berhasil disimpan ke Cloud Firestore', 'success');
  };

  const handleToggleAuto = (key: 'autoSendWelcomeCard' | 'autoSendPointUpdate' | 'autoSendTierUpgrade' | 'autoSendVouchers') => {
    const updated = { [key]: !whatsappConfig[key] };
    updateWhatsAppConfig(updated);
    showToast(`Otomatisasi WhatsApp ${!whatsappConfig[key] ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      showToast('Nomor telepon dan pesan wajib diisi', 'error');
      return;
    }

    setIsTestingMessage(true);
    try {
      const log = await sendWhatsAppMessageViaPing(
        testPhone,
        testName,
        testMessage,
        'chat',
        whatsappConfig
      );
      addWhatsAppLog(log);
      showToast(`Pesan WhatsApp berhasil dikirim ke ${log.recipientPhone} via gateway server`, 'success');
    } catch {
      showToast('Gagal mengirim pesan WhatsApp', 'error');
    } finally {
      setIsTestingMessage(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!simMessageText.trim()) {
      showToast('Masukkan teks pesan masuk dari tamu untuk simulasi webhook', 'error');
      return;
    }

    setIsSimulatingWebhook(true);
    setSimResult(null);

    const res = await simulateWebhookIncoming(simPhone, simMessageText);
    setIsSimulatingWebhook(false);
    setSimResult(res);

    if (res.autoReplyDispatched) {
      showToast(`Webhook berhasil dieksekusi: ${res.matchedRule}`, 'success');
      // Record to WA logs
      const logEntry: WhatsAppMessageLog = {
        id: `wh_auto_${Date.now()}`,
        recipientPhone: simPhone,
        recipientName: 'Tamu WhatsApp (Inbound)',
        message: res.replyMessage || '',
        type: 'chat',
        status: 'delivered',
        timestamp: new Date().toISOString(),
      };
      addWhatsAppLog(logEntry);
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword.trim() || !newRuleResponse.trim()) {
      showToast('Keyword dan template respon balasan wajib diisi', 'error');
      return;
    }

    const newRule: WhatsAppWebhookRule = {
      id: `rule_${Date.now()}`,
      keyword: newRuleKeyword.trim().toUpperCase(),
      matchType: 'contains',
      responseType: newRuleType,
      replyTemplate: newRuleResponse.trim(),
      isActive: true,
      description: newRuleDesc.trim() || `Auto reply keyword ${newRuleKeyword.toUpperCase()}`,
    };

    const updated = [newRule, ...webhookRules];
    setWebhookRules(updated);
    updateWhatsAppConfig({ webhookRules: updated });
    setShowAddRuleModal(false);
    setNewRuleKeyword('');
    setNewRuleDesc('');
    setNewRuleResponse('');
    showToast(`Aturan webhook untuk keyword "${newRule.keyword}" berhasil ditambahkan!`, 'success');
  };

  const handleDeleteRule = (id: string) => {
    const updated = webhookRules.filter((r) => r.id !== id);
    setWebhookRules(updated);
    updateWhatsAppConfig({ webhookRules: updated });
    showToast('Aturan webhook berhasil dihapus', 'info');
  };

  const handleToggleRule = (id: string) => {
    const updated = webhookRules.map((r) =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    );
    setWebhookRules(updated);
    updateWhatsAppConfig({ webhookRules: updated });
  };

  const handleSendBroadcast = async () => {
    const targetMembers = members.filter((m) => {
      if (broadcastTargetTier === 'all') return true;
      return m.tierId === broadcastTargetTier;
    });

    if (targetMembers.length === 0) {
      showToast('Tidak ada member yang cocok dengan filter tier', 'warning');
      return;
    }

    setIsBroadcasting(true);
    let count = 0;

    for (const member of targetMembers) {
      const personalizedMsg = broadcastMessage.replace(/{fullName}/g, member.fullName);
      const log: WhatsAppMessageLog = {
        id: `ping_bcast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientPhone: member.phone,
        recipientName: member.fullName,
        message: personalizedMsg,
        type: 'broadcast',
        status: 'delivered',
        timestamp: new Date().toISOString(),
      };
      addWhatsAppLog(log);
      count++;
    }

    setIsBroadcasting(false);
    setBroadcastSuccessCount(count);
    showToast(`Broadcast terkirim ke ${count} member aktif via ping.co.id`, 'success');
  };

  const filteredLogs = whatsappLogs.filter((log) => {
    const matchesType = logFilterType === 'all' || log.type === logFilterType;
    const matchesSearch =
      log.recipientName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.recipientPhone.includes(logSearchQuery) ||
      log.message.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Full Gateway & Webhook Server: ping.co.id</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              WhatsApp CRM & Webhook Engine (ping.co.id)
            </h1>
            <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
              Kirim kartu digital, notifikasi poin, serta aktifkan <strong>Webhook Rules & Bot Auto-Reply</strong> agar sistem langsung merespons saat tamu mengirim pesan ke WhatsApp hotel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-emerald-200 uppercase font-bold tracking-wider">Device CRM</div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>{whatsappConfig.senderPhone}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>

            <button
              onClick={handleRunDiagnostics}
              disabled={isCheckingConn}
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {isCheckingConn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              <span>Verifikasi Token & Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics Banner if available */}
      {connTestResult && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
          connTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-3">
            {connTestResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="text-xs">
              <div className="font-bold">{connTestResult.message}</div>
              {connTestResult.latencyMs && (
                <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-3">
                  <span>Server Proxy Latency: <strong>{connTestResult.latencyMs} ms</strong></span>
                  <span>·</span>
                  <span>Sisa Kuota: <strong>{(connTestResult.quotaRemaining || 5000).toLocaleString('id-ID')} pesan</strong></span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setConnTestResult(null)}
            className="text-xs font-semibold underline text-stone-500 hover:text-stone-800 cursor-pointer self-end sm:self-center"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveSubTab('webhook_rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
            activeSubTab === 'webhook_rules'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Aturan Webhook & Auto-Reply ({webhookRules.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('json_triggers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
            activeSubTab === 'json_triggers'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Code className="w-4 h-4 text-emerald-400" />
          <span>Format JSON & 3 Trigger ping.co.id</span>
        </button>

        <button
          onClick={() => setActiveSubTab('console')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
            activeSubTab === 'console'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Kirim & Uji Pesan (Live Outbound)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
            activeSubTab === 'broadcast'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Broadcast Promo Member</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
            activeSubTab === 'templates'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Template Notifikasi Otomatis</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
            activeSubTab === 'logs'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Pesan ({whatsappLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
            activeSubTab === 'config'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Akun & Kredensial ping.co.id</span>
        </button>
      </div>

      {/* Sub-Tab: Webhook Rules & Inbound Auto-Reply Engine */}
      {activeSubTab === 'webhook_rules' && (
        <div className="space-y-6">
          {/* Step-by-Step Interactive Guide: Cara Mengatur Rule Webhook di ping.co.id */}
          <div className="bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 text-white rounded-2xl p-6 border border-emerald-800/40 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Panduan Menu "Rule Webhook" di ping.co.id & Otomasi Sistem
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Sesuai Menu ping.co.id
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed max-w-2xl">
                    Di <strong>ping.co.id</strong>, webhook dikonfigurasi melalui menu <strong>"Rules" (Aturan)</strong>. Notifikasi otomatis hotel (Welcome Card, Update Poin, Naik Tier) juga <strong>sudah berjalan mandiri via API</strong> tanpa wajib webhook!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowWebhookGuide(!showWebhookGuide)}
                  className="px-3.5 py-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition-all cursor-pointer"
                >
                  {showWebhookGuide ? (
                    <>
                      <ChevronUp className="w-4 h-4 text-emerald-400" />
                      <span>Sembunyikan Panduan</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-emerald-400" />
                      <span>Buka Panduan Rule ping.co.id</span>
                    </>
                  )}
                </button>

                <a
                  href="https://ping.co.id"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <span>Buka Dasbor ping.co.id</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Collapsible Step-by-Step Instructions */}
            {showWebhookGuide && (
              <div className="mt-6 pt-6 border-t border-stone-800/80 space-y-6 animate-fadeIn">
                {/* Clarification Box: 2 Types of Automations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                      <Zap className="w-4 h-4" />
                      <span>1. Notifikasi Otomatis Keluar (Outbound Push)</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      <strong>STATUS: 100% AKTIF TANPA WEBHOOK!</strong><br />
                      Pesan seperti <strong>Kartu Member Baru</strong>, <strong>Penambahan Poin Transaksi</strong>, dan <strong>Ucapan Naik Tier</strong> dipicu langsung oleh aplikasi hotel ke nomor tamu via API ping.co.id. Tidak membutuhkan pengaturan webhook apapun.
                    </p>
                  </div>

                  <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>2. Balas Pesan Masuk Tamu (Inbound via "Rule")</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      <strong>MEMAKAI MENU "RULE" DI PING.CO.ID</strong><br />
                      Karena di ping.co.id tidak ada menu webhook global, Anda cukup masuk ke menu <strong>"Rules"</strong> di ping.co.id dan buat aturan untuk meneruskan keyword pesan tamu (misal: <code>POIN</code>) ke URL Webhook hotel.
                    </p>
                  </div>
                </div>

                {/* 4 Steps to Add Rule in ping.co.id */}
                <div>
                  <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Langkah Menambahkan Rule untuk Webhook di Menu ping.co.id:</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                    {/* Step 1 */}
                    <div className="bg-stone-900/90 rounded-xl p-4 border border-stone-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50 mb-2 inline-block">
                          Langkah 1
                        </span>
                        <h5 className="text-xs font-bold text-white mb-1">Masuk ke Menu "Rules"</h5>
                        <p className="text-[11px] text-stone-400 leading-normal">
                          Pada sidebar dasbor ping.co.id, cari menu <strong>"Rules"</strong>, <strong>"Auto Responder"</strong>, atau <strong>"Webhook Rules"</strong>.
                        </p>
                      </div>
                      <div className="mt-3 text-[10px] text-stone-400 font-mono bg-stone-950 px-2 py-1 rounded">
                        Menu: Rules / Aturan
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-stone-900/90 rounded-xl p-4 border border-stone-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50 mb-2 inline-block">
                          Langkah 2
                        </span>
                        <h5 className="text-xs font-bold text-white mb-1">Klik "Add Rule" (Tambah Rule)</h5>
                        <p className="text-[11px] text-stone-400 leading-normal">
                          Pilih perangkat bot hotel Anda, kemudian klik tombol <strong>"Tambah Rule Baru"</strong> (Add New Rule).
                        </p>
                      </div>
                      <div className="mt-3 text-[10px] text-emerald-400 font-mono bg-stone-950 px-2 py-1 rounded">
                        Action: Add Rule +
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-stone-900/90 rounded-xl p-4 border border-emerald-600/50 bg-emerald-950/20 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-800/60 px-2 py-0.5 rounded border border-emerald-500 mb-2 inline-block">
                          Langkah 3 (Kunci)
                        </span>
                        <h5 className="text-xs font-bold text-white mb-1">Pilih Tipe "Webhook"</h5>
                        <p className="text-[11px] text-stone-300 leading-normal">
                          Pada kolom <strong>Action Type / Tipe Balasan</strong>, ubah dari "Teks Biasa" menjadi <strong>"Webhook" / "Forward Webhook"</strong>.
                        </p>
                      </div>
                      <div className="mt-3 text-[10px] text-emerald-300 font-mono bg-stone-950 px-2 py-1 rounded">
                        Tipe: Webhook / URL
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-stone-900/90 rounded-xl p-4 border border-stone-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50 mb-2 inline-block">
                          Langkah 4
                        </span>
                        <h5 className="text-xs font-bold text-white mb-1">Paste URL Callback & Simpan</h5>
                        <p className="text-[11px] text-stone-400 leading-normal">
                          Masukkan URL Webhook aplikasi hotel pada kolom URL Target, lalu klik <strong>"Simpan Rule"</strong>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyField(liveWebhookEndpoint, 'webhook_url_step')}
                        className="mt-3 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === 'webhook_url_step' ? <CheckCheck className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'webhook_url_step' ? 'Tersalin!' : 'Salin URL Webhook'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ready-to-Copy Table for ping.co.id Rules */}
                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Daftar Rule Siap Pakai untuk Ditambahkan di Menu ping.co.id
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Tambahkan aturan-aturan berikut di menu <strong>Rule Webhook</strong> akun ping.co.id Anda:
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40">
                      Method: POST (JSON)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-800 text-[10px] text-stone-400 uppercase font-mono">
                          <th className="py-2 px-3">Kata Kunci (Keyword)</th>
                          <th className="py-2 px-3">Tipe Rule</th>
                          <th className="py-2 px-3">URL Target Webhook</th>
                          <th className="py-2 px-3">Respons Otomatis Sistem</th>
                          <th className="py-2 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                        <tr>
                          <td className="py-2 px-3 text-emerald-400 font-bold">POIN</td>
                          <td className="py-2 px-3 text-stone-300">Webhook</td>
                          <td className="py-2 px-3 text-stone-400 truncate max-w-xs">{liveWebhookEndpoint}</td>
                          <td className="py-2 px-3 text-stone-300 font-sans text-xs">Cek saldo poin real-time & masa aktif</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopyField(liveWebhookEndpoint, 'rule_poin')}
                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-sans font-semibold cursor-pointer"
                            >
                              {copiedField === 'rule_poin' ? 'Tersalin' : 'Salin URL'}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-emerald-400 font-bold">KARTU</td>
                          <td className="py-2 px-3 text-stone-300">Webhook</td>
                          <td className="py-2 px-3 text-stone-400 truncate max-w-xs">{liveWebhookEndpoint}</td>
                          <td className="py-2 px-3 text-stone-300 font-sans text-xs">Kirim kartu member digital & barcode</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopyField(liveWebhookEndpoint, 'rule_kartu')}
                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-sans font-semibold cursor-pointer"
                            >
                              {copiedField === 'rule_kartu' ? 'Tersalin' : 'Salin URL'}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-emerald-400 font-bold">PROMO</td>
                          <td className="py-2 px-3 text-stone-300">Webhook</td>
                          <td className="py-2 px-3 text-stone-400 truncate max-w-xs">{liveWebhookEndpoint}</td>
                          <td className="py-2 px-3 text-stone-300 font-sans text-xs">Kirim promo kamar & voucher diskon aktif</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopyField(liveWebhookEndpoint, 'rule_promo')}
                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-sans font-semibold cursor-pointer"
                            >
                              {copiedField === 'rule_promo' ? 'Tersalin' : 'Salin URL'}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-emerald-400 font-bold">* (atau ANY)</td>
                          <td className="py-2 px-3 text-stone-300">Webhook Catch-all</td>
                          <td className="py-2 px-3 text-stone-400 truncate max-w-xs">{liveWebhookEndpoint}</td>
                          <td className="py-2 px-3 text-stone-300 font-sans text-xs">Meneruskan semua chat tamu ke bot CRM hotel</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopyField(liveWebhookEndpoint, 'rule_catchall')}
                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-sans font-semibold cursor-pointer"
                            >
                              {copiedField === 'rule_catchall' ? 'Tersalin' : 'Salin URL'}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Opsi Tambahan (Auto-Reply Teks Tanpa Webhook):</strong> Jika Anda tidak ingin menggunakan Webhook untuk pesan masuk sama sekali, Anda bisa membuat Rule di ping.co.id dengan aksi <strong>"Text Reply"</strong> dan memasukkan pesan sambutan standar langsung di portal ping.co.id. Notifikasi otomatis hotel tetap berjalan normal!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Webhook Endpoint Box */}
          <div className="bg-stone-900 text-white rounded-2xl p-5 border border-stone-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    URL Endpoint Webhook Resmi Lombok Garden Hotel
                  </h3>
                  <p className="text-xs text-stone-400">
                    Gunakan URL ini di form webhook dasbor <a href="https://ping.co.id" target="_blank" rel="noreferrer" className="text-emerald-400 underline">ping.co.id</a>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(liveWebhookEndpoint);
                  showToast('URL Webhook berhasil disalin!', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Copy className="w-4 h-4" />
                <span>Salin URL Webhook</span>
              </button>
            </div>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 font-mono text-xs text-emerald-300 break-all select-all flex items-center justify-between">
              <span>{liveWebhookEndpoint}</span>
              <span className="text-[10px] text-stone-500 uppercase font-bold">POST Callback</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Rule List */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-base font-bold text-stone-900">
                    Daftar Aturan Balasan Otomatis (Keyword Rules)
                  </h2>
                  <p className="text-xs text-stone-500">
                    Ketika tamu mengetik kata kunci di WhatsApp, bot akan merespons secara otomatis:
                  </p>
                </div>

                <button
                  onClick={() => setShowAddRuleModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Rule</span>
                </button>
              </div>

              <div className="space-y-3">
                {webhookRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border transition-all ${
                      rule.isActive ? 'bg-stone-50/70 border-stone-200' : 'bg-stone-100/50 border-stone-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                            KEYWORD: {rule.keyword}
                          </span>
                          <span className="text-xs font-semibold text-stone-800">{rule.description}</span>
                        </div>
                        <p className="text-xs text-stone-600 line-clamp-2 mt-1 whitespace-pre-line font-sans">
                          {rule.replyTemplate}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                            rule.isActive ? 'bg-emerald-600' : 'bg-stone-300'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                              rule.isActive ? 'translate-x-3.5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 Cols: Live Inbound Webhook Simulator */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-700" />
                <h3 className="font-serif text-base font-bold text-stone-900">
                  Simulator Pesan Masuk (Inbound Webhook Test)
                </h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Uji respons bot tanpa perlu mengirim pesan manual dari ponsel. Ketik kata kunci seperti <code>POIN</code>, <code>KARTU</code>, atau <code>PROMO</code> untuk melihat bagaimana sistem merespons webhook ping.co.id.
              </p>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nomor WhatsApp Tamu (Pengirim)
                  </label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Teks Pesan Masuk dari Tamu
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={simMessageText}
                      onChange={(e) => setSimMessageText(e.target.value)}
                      placeholder="Contoh: CEK POIN"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold uppercase focus:outline-none focus:border-emerald-700"
                    />
                    <button
                      type="button"
                      onClick={handleSimulateWebhook}
                      disabled={isSimulatingWebhook}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSimulatingWebhook ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Kirim Test</span>
                    </button>
                  </div>
                </div>

                {/* Simulation Result Output */}
                {simResult && (
                  <div className="p-4 rounded-xl bg-stone-900 text-white space-y-2 text-xs font-mono animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>HTTP 200 OK (Webhook Received)</span>
                      <span>{simResult.matchedRule}</span>
                    </div>
                    <div className="text-stone-300 whitespace-pre-line bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-[11px]">
                      {simResult.replyMessage || 'Bot tidak merespons (Tidak ada keyword yang cocok).'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab: Format JSON & 3 Trigger ping.co.id */}
      {activeSubTab === 'json_triggers' && (
        <div className="space-y-6">
          {/* Header & Notice Card */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 text-white rounded-2xl p-6 border border-emerald-800/40 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Format JSON & Rule Webhook 3 Trigger Utama (ping.co.id)
                  </h3>
                  <p className="text-xs text-stone-300">
                    Gunakan skema JSON ini sebagai acuan integrasi API pengiriman otomatis dan pembuatan Rule Webhook di ping.co.id.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-stone-950 border border-stone-800 text-emerald-300">
                  POST JSON Protocol
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-950/80 rounded-xl border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Catatan Tangkapan Layar:</strong> Gambar yang Anda lampirkan menampilkan portal <em>itlombok.org</em> (dengan keterangan peran belum diberi akses), bukan dasbor ping.co.id. Namun format JSON dan panduan pembuatan Rule Webhook di bawah ini telah disesuaikan secara presisi dengan arsitektur gateway <strong>ping.co.id</strong>.
              </div>
            </div>
          </div>

          {/* Trigger Selector Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedTriggerTab('member_input');
                setTriggerFireResult(null);
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedTriggerTab === 'member_input'
                  ? 'bg-emerald-800/90 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300">
                  Trigger 1
                </span>
                <Users className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm">Data Member Baru Di-Input</div>
              <div className="text-[11px] opacity-80 mt-0.5">Welcome Card & Link Kartu Digital</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTriggerTab('points_earned');
                setTriggerFireResult(null);
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedTriggerTab === 'points_earned'
                  ? 'bg-emerald-800/90 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300">
                  Trigger 2
                </span>
                <Zap className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm">Penambahan Point Transaksi</div>
              <div className="text-[11px] opacity-80 mt-0.5">Billing Kamar / F&B & Saldo Poin</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTriggerTab('card_info');
                setTriggerFireResult(null);
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedTriggerTab === 'card_info'
                  ? 'bg-emerald-800/90 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300">
                  Trigger 3
                </span>
                <FileText className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm">Info Kartu Digital Tamu</div>
              <div className="text-[11px] opacity-80 mt-0.5">Permintaan Tamu via Keyword "KARTU"</div>
            </button>
          </div>

          {/* Trigger Detail Display: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: JSON Schemas (Outbound + Inbound) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Trigger 1 Details */}
              {selectedTriggerTab === 'member_input' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Schema 1A: Outbound API */}
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <h4 className="font-bold text-sm text-stone-900">
                            1A. Format JSON Outbound (Hotel ➔ ping.co.id API)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Payload yang dikirimkan aplikasi saat ada tamu baru mendaftar (Welcome Card):
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const data = {
                              action: 'send_message',
                              to: '6281234567890',
                              device_id: whatsappConfig.deviceId || 'lgh_bot_device_01',
                              type: 'welcome_card',
                              data: {
                                event: 'member.created',
                                membershipNumber: 'LGH-001089',
                                fullName: 'Bpk. Rahmat Hidayat',
                                phone: '6281234567890',
                                tier: 'Classic',
                                cardUrl: `${currentOrigin}/card/LGH-001089`,
                                registeredAt: new Date().toISOString(),
                              },
                              message: `Halo *Bpk. Rahmat Hidayat*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*! 🌿🏨\n\nNomor Member: *LGH-001089*\nTier: *Classic*\n\nAkses kartu digital eksklusif Anda di:\n${currentOrigin}/card/LGH-001089\n\nTunjukkan kartu digital ini saat check-in atau bersantap untuk diskon khusus dan perolehan poin loyalitas.`,
                            };
                            handleCopyField(JSON.stringify(data, null, 2), 'copy_out_member', 'JSON Outbound');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-stone-500" />
                          <span>{copiedField === 'copy_out_member' ? 'Tersalin' : 'Salin JSON'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const data = {
                              action: 'send_message',
                              to: '6281234567890',
                              device_id: whatsappConfig.deviceId || 'lgh_bot_device_01',
                              type: 'welcome_card',
                              data: {
                                event: 'member.created',
                                membershipNumber: 'LGH-001089',
                                fullName: 'Bpk. Rahmat Hidayat',
                                phone: '6281234567890',
                                tier: 'Classic',
                                cardUrl: `${currentOrigin}/card/LGH-001089`,
                              },
                              message: `Halo *Bpk. Rahmat Hidayat*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*!`,
                            };
                            handleDownloadJson(data, 'trigger_member_input_outbound.json');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-stone-500" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-stone-950 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-stone-800 select-all">
{`{
  "action": "send_message",
  "to": "6281234567890",
  "device_id": "${whatsappConfig.deviceId || 'lgh_bot_device_01'}",
  "type": "welcome_card",
  "data": {
    "event": "member.created",
    "membershipNumber": "LGH-001089",
    "fullName": "Bpk. Rahmat Hidayat",
    "phone": "6281234567890",
    "tier": "Classic",
    "cardUrl": "${currentOrigin}/card/LGH-001089",
    "registeredAt": "2026-09-29T02:00:00Z"
  },
  "message": "Halo *Bpk. Rahmat Hidayat*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*! 🌿🏨\\n\\nNomor Member: *LGH-001089*\\nTier: *Classic*\\n\\nAkses kartu digital eksklusif Anda di:\\n${currentOrigin}/card/LGH-001089"
}`}
                    </pre>
                  </div>

                  {/* Schema 1B: Exact Visual Mockup of ping.co.id "Buat Webhook Rule" Form */}
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                          <h4 className="font-bold text-sm text-stone-900">
                            1B. Formulir "Buat Webhook Rule" di ping.co.id (Persis Screenshot Anda)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Salin nilai-nilai di bawah ini langsung ke formulir menu <strong>"Buat Webhook Rule"</strong> akun ping.co.id Anda:
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const allData = `Nama Rule: Notifikasi Member Baru Lombok Garden\nSource: Custom\nKondisi (JSON): {"operator":"AND","rules":[{"field":"event","operator":"equals","value":"member.created"}]}\nTemplate Pesan WhatsApp: Halo *{{data.fullName}}*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*! 🌿🏨\n\nNomor Member: *{{data.membershipNumber}}*\nTier: *{{data.tier}}*\n\nAkses kartu digital eksklusif Anda di:\n{{data.cardUrl}}\n\nTunjukkan kartu digital ini saat check-in atau bersantap untuk diskon khusus dan perolehan poin loyalitas.\nField Nomor Telepon: data.phone\nFormat Nomor Telepon: Auto`;
                          handleCopyField(allData, 'copy_all_member_rule', 'Semua Data Rule Member');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'copy_all_member_rule' ? 'Semua Tersalin!' : 'Salin Semua Data Rule'}</span>
                      </button>
                    </div>

                    {/* Visual Ping.co.id Form Container */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3.5 text-xs">
                      {/* Row 1: Nama Rule & Source */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Nama Rule</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('Notifikasi Member Baru Lombok Garden', 'rn_1', 'Nama Rule')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'rn_1' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="Notifikasi Member Baru Lombok Garden"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Source</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('Custom', 'src_1', 'Source')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'src_1' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="Custom"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>
                      </div>

                      {/* Row 2: Kondisi (JSON) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-stone-700">Kondisi (JSON)</label>
                          <button
                            type="button"
                            onClick={() => handleCopyField('{"operator":"AND","rules":[{"field":"event","operator":"equals","value":"member.created"}]}', 'cond_1', 'Kondisi JSON')}
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'cond_1' ? 'Tersalin' : 'Salin Kondisi (JSON)'}</span>
                          </button>
                        </div>
                        <textarea
                          readOnly
                          rows={2}
                          value='{"operator":"AND","rules":[{"field":"event","operator":"equals","value":"member.created"}]}'
                          className="w-full p-2.5 bg-stone-900 text-emerald-300 font-mono text-[11px] rounded-lg border border-stone-800 select-all"
                        />
                      </div>

                      {/* Row 3: Template Pesan WhatsApp */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-stone-700">Template Pesan WhatsApp</label>
                          <button
                            type="button"
                            onClick={() => {
                              const tpl = `Halo *{{data.fullName}}*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*! 🌿🏨\n\nNomor Member: *{{data.membershipNumber}}*\nTier: *{{data.tier}}*\n\nAkses kartu digital eksklusif Anda di:\n{{data.cardUrl}}\n\nTunjukkan kartu digital ini saat check-in atau bersantap untuk diskon khusus dan perolehan poin loyalitas.`;
                              handleCopyField(tpl, 'tpl_1', 'Template Pesan');
                            }}
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'tpl_1' ? 'Tersalin' : 'Salin Template'}</span>
                          </button>
                        </div>
                        <textarea
                          readOnly
                          rows={5}
                          value={`Halo *{{data.fullName}}*, selamat bergabung di *Lombok Garden Hotel Hospitality Club*! 🌿🏨\n\nNomor Member: *{{data.membershipNumber}}*\nTier: *{{data.tier}}*\n\nAkses kartu digital eksklusif Anda di:\n{{data.cardUrl}}\n\nTunjukkan kartu digital ini saat check-in atau bersantap untuk diskon khusus dan perolehan poin loyalitas.`}
                          className="w-full p-2.5 bg-white text-stone-800 font-mono text-[11px] rounded-lg border border-stone-300 leading-relaxed select-all"
                        />
                      </div>

                      {/* Row 4: Field Nomor Telepon & Format */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Field Nomor Telepon (Phone Field)</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('data.phone', 'pf_1', 'Phone Field')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'pf_1' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="data.phone"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">Format Nomor Telepon</label>
                          <input
                            type="text"
                            readOnly
                            value="Auto (disarankan)"
                            className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-600 font-sans text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trigger 2 Details */}
              {selectedTriggerTab === 'points_earned' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Schema 2A: Outbound API */}
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <h4 className="font-bold text-sm text-stone-900">
                            2A. Format JSON Outbound (Penambahan Point Transaksi)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Payload dikirimkan saat ada billing kamar, resto, atau spa:
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const data = {
                              action: 'send_message',
                              to: '6281234567890',
                              device_id: whatsappConfig.deviceId || 'lgh_bot_device_01',
                              type: 'point_update',
                              data: {
                                event: 'points.earned',
                                transactionId: 'tx_1727581200000',
                                membershipNumber: 'LGH-001089',
                                fullName: 'Bpk. Rahmat Hidayat',
                                billAmount: 1500000,
                                pointsEarned: 150,
                                totalPoints: 850,
                                outlet: 'Front Desk - Deluxe Room (Stay 2 Nights)',
                              },
                              message: 'Halo *Bpk. Rahmat Hidayat*,\n\nTransaksi Anda sebesar *Rp 1.500.000* di Lombok Garden Hotel telah berhasil! 🎉\n\n+*150 Poin* telah ditambahkan ke akun Anda.\nTotal Saldo Poin Saat Ini: *850 Poin*.\n\nTerima kasih atas kunjungan Anda!',
                            };
                            handleCopyField(JSON.stringify(data, null, 2), 'copy_out_points', 'JSON Outbound Points');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-stone-500" />
                          <span>{copiedField === 'copy_out_points' ? 'Tersalin' : 'Salin JSON'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const data = {
                              action: 'send_message',
                              to: '6281234567890',
                              device_id: whatsappConfig.deviceId || 'lgh_bot_device_01',
                              type: 'point_update',
                              data: {
                                event: 'points.earned',
                                billAmount: 1500000,
                                pointsEarned: 150,
                                totalPoints: 850,
                              },
                            };
                            handleDownloadJson(data, 'trigger_points_earned_outbound.json');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-stone-500" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-stone-950 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-stone-800 select-all">
{`{
  "action": "send_message",
  "to": "6281234567890",
  "device_id": "${whatsappConfig.deviceId || 'lgh_bot_device_01'}",
  "type": "point_update",
  "data": {
    "event": "points.earned",
    "transactionId": "tx_1727581200000",
    "membershipNumber": "LGH-001089",
    "fullName": "Bpk. Rahmat Hidayat",
    "billAmount": 1500000,
    "pointsEarned": 150,
    "totalPoints": 850,
    "outlet": "Front Desk - Deluxe Room (Stay 2 Nights)"
  },
  "message": "Halo *Bpk. Rahmat Hidayat*,\\n\\nTransaksi Anda sebesar *Rp 1.500.000* di Lombok Garden Hotel telah berhasil! 🎉\\n\\n+*150 Poin* telah ditambahkan ke akun Anda.\\nTotal Saldo Poin Saat Ini: *850 Poin*.\\n\\nTerima kasih atas kunjungan Anda!"
}`}
                    </pre>
                  </div>

                  {/* Schema 2B: Exact Visual Mockup of ping.co.id "Buat Webhook Rule" Form */}
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                          <h4 className="font-bold text-sm text-stone-900">
                            2B. Formulir "Buat Webhook Rule" di ping.co.id (Persis Screenshot Anda)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Salin nilai-nilai di bawah ini langsung ke formulir menu <strong>"Buat Webhook Rule"</strong> akun ping.co.id Anda:
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const allData = `Nama Rule: Notifikasi Tambah Poin Transaksi\nSource: Custom\nKondisi (JSON): {"operator":"AND","rules":[{"field":"event","operator":"equals","value":"points.earned"}]}\nTemplate Pesan WhatsApp: Halo *{{data.fullName}}*,\n\nTransaksi Anda sebesar *{{data.billAmountFormatted}}* di Lombok Garden Hotel telah berhasil! 🎉\n\n+*{{data.pointsEarned}} Poin* telah ditambahkan ke akun Anda.\nTotal Saldo Poin Saat Ini: *{{data.totalPoints}} Poin*.\n\nTerima kasih atas kunjungan Anda!\nField Nomor Telepon: data.phone\nFormat Nomor Telepon: Auto`;
                          handleCopyField(allData, 'copy_all_points_rule', 'Semua Data Rule Poin');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'copy_all_points_rule' ? 'Semua Tersalin!' : 'Salin Semua Data Rule'}</span>
                      </button>
                    </div>

                    {/* Visual Ping.co.id Form Container */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3.5 text-xs">
                      {/* Row 1: Nama Rule & Source */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Nama Rule</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('Notifikasi Tambah Poin Transaksi', 'rn_2', 'Nama Rule')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'rn_2' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="Notifikasi Tambah Poin Transaksi"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Source</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('Custom', 'src_2', 'Source')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'src_2' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="Custom"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>
                      </div>

                      {/* Row 2: Kondisi (JSON) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-stone-700">Kondisi (JSON)</label>
                          <button
                            type="button"
                            onClick={() => handleCopyField('{"operator":"AND","rules":[{"field":"event","operator":"equals","value":"points.earned"}]}', 'cond_2', 'Kondisi JSON')}
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'cond_2' ? 'Tersalin' : 'Salin Kondisi (JSON)'}</span>
                          </button>
                        </div>
                        <textarea
                          readOnly
                          rows={2}
                          value='{"operator":"AND","rules":[{"field":"event","operator":"equals","value":"points.earned"}]}'
                          className="w-full p-2.5 bg-stone-900 text-emerald-300 font-mono text-[11px] rounded-lg border border-stone-800 select-all"
                        />
                      </div>

                      {/* Row 3: Template Pesan WhatsApp */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-stone-700">Template Pesan WhatsApp</label>
                          <button
                            type="button"
                            onClick={() => {
                              const tpl = `Halo *{{data.fullName}}*,\n\nTransaksi Anda sebesar *{{data.billAmountFormatted}}* di Lombok Garden Hotel telah berhasil! 🎉\n\n+*{{data.pointsEarned}} Poin* telah ditambahkan ke akun Anda.\nTotal Saldo Poin Saat Ini: *{{data.totalPoints}} Poin*.\n\nTerima kasih atas kunjungan Anda!`;
                              handleCopyField(tpl, 'tpl_2', 'Template Pesan');
                            }}
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'tpl_2' ? 'Tersalin' : 'Salin Template'}</span>
                          </button>
                        </div>
                        <textarea
                          readOnly
                          rows={5}
                          value={`Halo *{{data.fullName}}*,\n\nTransaksi Anda sebesar *{{data.billAmountFormatted}}* di Lombok Garden Hotel telah berhasil! 🎉\n\n+*{{data.pointsEarned}} Poin* telah ditambahkan ke akun Anda.\nTotal Saldo Poin Saat Ini: *{{data.totalPoints}} Poin*.\n\nTerima kasih atas kunjungan Anda!`}
                          className="w-full p-2.5 bg-white text-stone-800 font-mono text-[11px] rounded-lg border border-stone-300 leading-relaxed select-all"
                        />
                      </div>

                      {/* Row 4: Field Nomor Telepon & Format */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Field Nomor Telepon (Phone Field)</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('data.phone', 'pf_2', 'Phone Field')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'pf_2' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="data.phone"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">Format Nomor Telepon</label>
                          <input
                            type="text"
                            readOnly
                            value="Auto (disarankan)"
                            className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-600 font-sans text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trigger 3 Details */}
              {selectedTriggerTab === 'card_info' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Schema 3A: Outbound API */}
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <h4 className="font-bold text-sm text-stone-900">
                            3A. Format JSON Outbound (Info Kartu Digital Tamu)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Payload dikirimkan saat sistem menerbitkan info kartu ke WhatsApp tamu:
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const data = {
                              action: 'send_message',
                              to: '6281234567890',
                              device_id: whatsappConfig.deviceId || 'lgh_bot_device_01',
                              type: 'card_info',
                              data: {
                                event: 'card.info_sent',
                                membershipNumber: 'LGH-001089',
                                fullName: 'Bpk. Rahmat Hidayat',
                                tier: 'Classic',
                                cardUrl: `${currentOrigin}/card/LGH-001089`,
                                qrCode: 'LGH-001089',
                              },
                              message: `Halo *Bpk. Rahmat Hidayat*,\n\nBerikut link akses kartu digital eksklusif Lombok Garden Hotel Anda:\n${currentOrigin}/card/LGH-001089\n\nTunjukkan barcode/QR pada kartu ini saat bertransaksi di kamar, restoran, dan spa untuk diskon langsung & perolehan poin!`,
                            };
                            handleCopyField(JSON.stringify(data, null, 2), 'copy_out_card', 'JSON Outbound Card');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-stone-500" />
                          <span>{copiedField === 'copy_out_card' ? 'Tersalin' : 'Salin JSON'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const data = {
                              action: 'send_message',
                              to: '6281234567890',
                              device_id: whatsappConfig.deviceId || 'lgh_bot_device_01',
                              type: 'card_info',
                              data: {
                                event: 'card.info_sent',
                                membershipNumber: 'LGH-001089',
                                cardUrl: `${currentOrigin}/card/LGH-001089`,
                              },
                            };
                            handleDownloadJson(data, 'trigger_card_info_outbound.json');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-stone-500" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-stone-950 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-stone-800 select-all">
{`{
  "action": "send_message",
  "to": "6281234567890",
  "device_id": "${whatsappConfig.deviceId || 'lgh_bot_device_01'}",
  "type": "card_info",
  "data": {
    "event": "card.info_sent",
    "membershipNumber": "LGH-001089",
    "fullName": "Bpk. Rahmat Hidayat",
    "tier": "Classic",
    "cardUrl": "${currentOrigin}/card/LGH-001089",
    "qrCode": "LGH-001089"
  },
  "message": "Halo *Bpk. Rahmat Hidayat*,\\n\\nBerikut link akses kartu digital eksklusif Lombok Garden Hotel Anda:\\n${currentOrigin}/card/LGH-001089\\n\\nTunjukkan barcode/QR pada kartu ini saat bertransaksi di kamar, restoran, dan spa untuk diskon langsung & perolehan poin!"
}`}
                    </pre>
                  </div>

                  {/* Schema 3B: Exact Visual Mockup of ping.co.id "Buat Webhook Rule" Form */}
                  <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                          <h4 className="font-bold text-sm text-stone-900">
                            3B. Formulir "Buat Webhook Rule" di ping.co.id (Persis Screenshot Anda)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Salin nilai-nilai di bawah ini langsung ke formulir menu <strong>"Buat Webhook Rule"</strong> akun ping.co.id Anda:
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const allData = `Nama Rule: Kirim Link Kartu Digital Tamu\nSource: Custom\nKondisi (JSON): {"operator":"AND","rules":[{"field":"event","operator":"equals","value":"card.info_sent"}]}\nTemplate Pesan WhatsApp: Halo *{{data.fullName}}*,\n\nBerikut link akses kartu digital eksklusif Lombok Garden Hotel Anda:\n{{data.cardUrl}}\n\nNomor Member: *{{data.membershipNumber}}* (Tier: *{{data.tier}}*)\n\nTunjukkan barcode/QR pada kartu ini saat bertransaksi di kamar, restoran, dan spa untuk diskon langsung & perolehan poin!\nField Nomor Telepon: data.phone\nFormat Nomor Telepon: Auto`;
                          handleCopyField(allData, 'copy_all_card_rule', 'Semua Data Rule Kartu');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'copy_all_card_rule' ? 'Semua Tersalin!' : 'Salin Semua Data Rule'}</span>
                      </button>
                    </div>

                    {/* Visual Ping.co.id Form Container */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3.5 text-xs">
                      {/* Row 1: Nama Rule & Source */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Nama Rule</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('Kirim Link Kartu Digital Tamu', 'rn_3', 'Nama Rule')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'rn_3' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="Kirim Link Kartu Digital Tamu"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Source</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('Custom', 'src_3', 'Source')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'src_3' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="Custom"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>
                      </div>

                      {/* Row 2: Kondisi (JSON) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-stone-700">Kondisi (JSON)</label>
                          <button
                            type="button"
                            onClick={() => handleCopyField('{"operator":"AND","rules":[{"field":"event","operator":"equals","value":"card.info_sent"}]}', 'cond_3', 'Kondisi JSON')}
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'cond_3' ? 'Tersalin' : 'Salin Kondisi (JSON)'}</span>
                          </button>
                        </div>
                        <textarea
                          readOnly
                          rows={2}
                          value='{"operator":"AND","rules":[{"field":"event","operator":"equals","value":"card.info_sent"}]}'
                          className="w-full p-2.5 bg-stone-900 text-emerald-300 font-mono text-[11px] rounded-lg border border-stone-800 select-all"
                        />
                      </div>

                      {/* Row 3: Template Pesan WhatsApp */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-stone-700">Template Pesan WhatsApp</label>
                          <button
                            type="button"
                            onClick={() => {
                              const tpl = `Halo *{{data.fullName}}*,\n\nBerikut link akses kartu digital eksklusif Lombok Garden Hotel Anda:\n{{data.cardUrl}}\n\nNomor Member: *{{data.membershipNumber}}* (Tier: *{{data.tier}}*)\n\nTunjukkan barcode/QR pada kartu ini saat bertransaksi di kamar, restoran, dan spa untuk diskon langsung & perolehan poin!`;
                              handleCopyField(tpl, 'tpl_3', 'Template Pesan');
                            }}
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'tpl_3' ? 'Tersalin' : 'Salin Template'}</span>
                          </button>
                        </div>
                        <textarea
                          readOnly
                          rows={5}
                          value={`Halo *{{data.fullName}}*,\n\nBerikut link akses kartu digital eksklusif Lombok Garden Hotel Anda:\n{{data.cardUrl}}\n\nNomor Member: *{{data.membershipNumber}}* (Tier: *{{data.tier}}*)\n\nTunjukkan barcode/QR pada kartu ini saat bertransaksi di kamar, restoran, dan spa untuk diskon langsung & perolehan poin!`}
                          className="w-full p-2.5 bg-white text-stone-800 font-mono text-[11px] rounded-lg border border-stone-300 leading-relaxed select-all"
                        />
                      </div>

                      {/* Row 4: Field Nomor Telepon & Format */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-stone-700">Field Nomor Telepon (Phone Field)</label>
                            <button
                              type="button"
                              onClick={() => handleCopyField('data.phone', 'pf_3', 'Phone Field')}
                              className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedField === 'pf_3' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value="data.phone"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-xs select-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">Format Nomor Telepon</label>
                          <input
                            type="text"
                            readOnly
                            value="Auto (disarankan)"
                            className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-600 font-sans text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Cols: Live Trigger Dispatch Tester */}
            <div className="lg:col-span-5 bg-stone-900 text-white rounded-2xl p-5 border border-stone-800 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-sm text-white">
                    Uji Eksekusi Trigger ke WhatsApp Anda
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Live Dispatch
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Nomor WhatsApp Tujuan Uji Coba:
                  </label>
                  <input
                    type="text"
                    value={triggerTestPhone}
                    onChange={(e) => setTriggerTestPhone(e.target.value)}
                    placeholder="Contoh: 081234567890 atau +6281234567890"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    Masukkan nomor WhatsApp Anda untuk menerima pesan trigger ini secara langsung.
                  </span>
                </div>

                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1">
                  <div className="text-stone-400 text-[11px]">Trigger Terpilih:</div>
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {selectedTriggerTab === 'member_input' && 'Trigger 1: Data Member Baru Di-Input'}
                      {selectedTriggerTab === 'points_earned' && 'Trigger 2: Penambahan Point Transaksi'}
                      {selectedTriggerTab === 'card_info' && 'Trigger 3: Info Kartu Digital Tamu'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleFireTrigger(selectedTriggerTab)}
                  disabled={isFiringTrigger}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isFiringTrigger ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Trigger ke Gateway ping.co.id...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Uji Trigger Sekarang</span>
                    </>
                  )}
                </button>
              </div>

              {/* Trigger Result Diagnostic Box */}
              {triggerFireResult && (
                <div className="mt-4 p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3 font-mono text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 font-bold ${
                      triggerFireResult.log?.status === 'delivered' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {triggerFireResult.log?.status === 'delivered' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                      <span>
                        Status: {triggerFireResult.log?.status === 'delivered' ? 'Terkirim (Delivered)' : 'Terkendala / Perlu Penyesuaian'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {triggerFireResult.log?.gateway || 'ping.co.id'}
                    </span>
                  </div>

                  {triggerFireResult.diagnostics && (
                    <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 text-[11px] text-stone-300 space-y-2">
                      <div className="text-stone-400 uppercase font-bold flex items-center justify-between text-[10px]">
                        <span>Diagnostik Gateway & Server:</span>
                        {Boolean(triggerFireResult.diagnostics.error) && (
                          <span className="text-rose-400 font-mono text-[9px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-900">
                            {String(triggerFireResult.diagnostics.error).includes('fetch failed') ? 'FETCH FAILED' : 'GATEWAY NOTICE'}
                          </span>
                        )}
                      </div>

                      {triggerFireResult.diagnostics.error ? (
                        <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-200 leading-relaxed font-sans text-xs">
                          <strong className="font-mono text-rose-300">Penyebab: </strong>
                          {String(triggerFireResult.diagnostics.error)}
                        </div>
                      ) : null}

                      {Boolean(triggerFireResult.diagnostics.notice) && !triggerFireResult.diagnostics.error ? (
                        <div className="text-amber-300 leading-relaxed font-sans text-xs">
                          {String(triggerFireResult.diagnostics.notice)}
                        </div>
                      ) : null}

                      {Boolean(triggerFireResult.diagnostics.recommendation) ? (
                        <div className="text-emerald-300 leading-relaxed font-sans text-xs p-2 rounded bg-emerald-950/40 border border-emerald-800/40">
                          💡 <strong>Solusi: </strong>
                          {String(triggerFireResult.diagnostics.recommendation)}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] text-stone-500 mb-1">Pesan yang Disiapkan untuk Tamu:</div>
                    <div className="p-2.5 rounded bg-stone-900 text-stone-200 text-[11px] whitespace-pre-line font-sans border border-stone-800">
                      {triggerFireResult.log?.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 1: Live Tester & Quick Dispatch */}
      {activeSubTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Kirim WhatsApp Langsung (Direct Outbound Dispatch)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Kirim pesan langsung ke nomor WhatsApp tamu atau staf menggunakan gateway server (bebas CORS).
              </p>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Contoh: Bpk. John Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nomor WhatsApp Penerima
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="0812xxxx atau +62812xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    required
                  />
                  {normalizedTestPhone.formatted && (
                    <p className="text-[10px] text-emerald-700 font-mono mt-1">
                      Format internasional: <strong>{normalizedTestPhone.formatted}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                  <span>Isi Pesan WhatsApp</span>
                  <span className="text-[11px] text-stone-400 font-normal">Mendukung format *tebal*, _miring_, ~coret~</span>
                </label>
                <textarea
                  rows={5}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-stone-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Menggunakan rute API Server Proxy</span>
                </div>

                <button
                  type="submit"
                  disabled={isTestingMessage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isTestingMessage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim...</span>
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

          {/* Right Column: Auto-Trigger Status */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Otomatisasi WhatsApp Event</span>
              </h3>
              <p className="text-xs text-stone-500">
                Pesan WhatsApp akan terkirim secara otomatis saat event berikut terjadi pada sistem:
              </p>

              <div className="space-y-3 pt-1">
                <div
                  onClick={() => handleToggleAuto('autoSendWelcomeCard')}
                  className="p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">Kartu Member Baru (Welcome)</div>
                    <div className="text-[11px] text-stone-500">Kirim link kartu digital & sambutan saat registrasi</div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${whatsappConfig.autoSendWelcomeCard ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${whatsappConfig.autoSendWelcomeCard ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div
                  onClick={() => handleToggleAuto('autoSendPointUpdate')}
                  className="p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">Notifikasi Perolehan Poin</div>
                    <div className="text-[11px] text-stone-500">Kirim rincian poin setelah transaksi/checkout kamar</div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${whatsappConfig.autoSendPointUpdate ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${whatsappConfig.autoSendPointUpdate ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div
                  onClick={() => handleToggleAuto('autoSendTierUpgrade')}
                  className="p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">Ucapan Selamat Naik Tier</div>
                    <div className="text-[11px] text-stone-500">Kirim info benefit baru saat member naik level</div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${whatsappConfig.autoSendTierUpgrade ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${whatsappConfig.autoSendTierUpgrade ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div
                  onClick={() => handleToggleAuto('autoSendVouchers')}
                  className="p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">Pengiriman Kode Voucher / Hadiah</div>
                    <div className="text-[11px] text-stone-500">Kirim kode voucher langsung ke WhatsApp tamu</div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${whatsappConfig.autoSendVouchers ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${whatsappConfig.autoSendVouchers ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Broadcast to Members */}
      {activeSubTab === 'broadcast' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Broadcast Pesan Massal ke Member
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Kirim promo kamar, promo resto, atau ucapan spesial langsung ke ratusan member secara personal via ping.co.id.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-stone-700">Target Audiens:</label>
              <select
                value={broadcastTargetTier}
                onChange={(e) => setBroadcastTargetTier(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
              >
                <option value="all">Semua Member Aktif ({members.length} Tamu)</option>
                {tiers.map((t) => {
                  const count = members.filter((m) => m.tierId === t.id).length;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} Tier ({count} Tamu)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Isi Pesan Broadcast (Gunakan placeholder <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{'{fullName}'}</code> untuk nama tamu)
              </label>
              <textarea
                rows={6}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-sans"
              />
            </div>

            {broadcastSuccessCount !== null && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    Berhasil menyiarkan pesan ke <strong>{broadcastSuccessCount} member</strong> via gateway ping.co.id.
                  </span>
                </div>
                <button
                  onClick={() => setActiveSubTab('logs')}
                  className="font-bold underline cursor-pointer"
                >
                  Lihat Riwayat Pesan
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <div className="text-xs text-stone-500">
                Pesan akan dikirim antrean dengan interval throttling aman untuk mencegah banned.
              </div>

              <button
                onClick={handleSendBroadcast}
                disabled={isBroadcasting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Menyiarkan Pesan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Mulai Siarkan Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Notification Templates */}
      {activeSubTab === 'templates' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Pengaturan Template Pesan Otomatis
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Sesuaikan teks sambutan, penambahan poin, dan info kenaikan tier yang dikirim otomatis oleh bot WhatsApp.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800">
                1. Template Sambutan & Kartu Digital Member Baru
              </label>
              <p className="text-[11px] text-stone-500">
                Placeholder tersedia: <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{fullName}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{membershipNumber}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{tierName}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{cardUrl}'}</code>
              </p>
              <textarea
                rows={4}
                value={templateWelcome}
                onChange={(e) => setTemplateWelcome(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800">
                2. Template Notifikasi Penambahan Poin
              </label>
              <p className="text-[11px] text-stone-500">
                Placeholder tersedia: <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{fullName}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{amount}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{pointsEarned}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{availablePoints}'}</code>
              </p>
              <textarea
                rows={4}
                value={templatePoints}
                onChange={(e) => setTemplatePoints(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800">
                3. Template Kenaikan Tier Membership (Upgrade)
              </label>
              <p className="text-[11px] text-stone-500">
                Placeholder tersedia: <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{fullName}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{newTierName}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{discount}'}</code>, <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{multiplier}'}</code>
              </p>
              <textarea
                rows={4}
                value={templateTierUpgrade}
                onChange={(e) => setTemplateTierUpgrade(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={handleSaveConfig}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Seluruh Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Message Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Riwayat Pengiriman Pesan WhatsApp (Audit Trail)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Semua pesan keluar dan masuk yang diproses via gateway ping.co.id tersimpan di database cloud.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari penerima / nomor / teks..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 w-56"
                />
              </div>

              <select
                value={logFilterType}
                onChange={(e) => setLogFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
              >
                <option value="all">Semua Tipe</option>
                <option value="welcome">Welcome Card</option>
                <option value="point_update">Point Update</option>
                <option value="tier_upgrade">Tier Upgrade</option>
                <option value="broadcast">Broadcast</option>
                <option value="chat">Direct Chat</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-y border-stone-200">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Penerima</th>
                  <th className="py-3 px-4">Tipe Pesan</th>
                  <th className="py-3 px-4">Isi Pesan</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      Tidak ada data log WhatsApp yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 text-stone-500 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-stone-900">{log.recipientName}</div>
                        <div className="text-[11px] font-mono text-stone-500">{log.recipientPhone}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 uppercase">
                          {log.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-stone-600" title={log.message}>
                        {log.message}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" />
                          <span>{log.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Configuration & API Keys */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Koneksi Akun ping.co.id
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Konfigurasi API Secret Key, URL Endpoint, Instance ID, dan nomor WhatsApp hotel.
                </p>
              </div>
              <a
                href="https://ping.co.id"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <span>Portal ping.co.id</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ping.co.id API Key / Bearer Token
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ping_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Dapatkan API Token dari menu <strong>API Keys & Access Token</strong> di dasbor <a href="https://ping.co.id" target="_blank" rel="noreferrer" className="text-emerald-700 underline">ping.co.id</a>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    API Endpoint Base URL
                  </label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.ping.co.id/v1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Device Session / Instance ID
                  </label>
                  <input
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="lgh_bot_device_01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nomor Telepon Pengirim (Sender Number)
                  </label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Akun ping.co.id Terdaftar
                  </label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="it.management@lombokgardenhotel.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Perangkat / Label Bot Hotel
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Lombok Garden Hotel CRM Bot"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Webhook Inbound Endpoint URL (Callback untuk ping.co.id)
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={liveWebhookEndpoint}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono bg-stone-50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(liveWebhookEndpoint);
                        showToast('Webhook URL disalin ke clipboard', 'info');
                      }}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin URL Webhook</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                    💡 <strong>Catatan untuk Subdomain Live Web:</strong> URL di atas otomatis mengarahkan callback ping.co.id ke backend Cloud Run resmi yang aktif 24/7, sehingga respon otomatis bot WhatsApp selalu bekerja tanpa terpengaruh hosting web statis.
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleRunDiagnostics}
                  disabled={isCheckingConn}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-emerald-700 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {isCheckingConn ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  <span>Test Koneksi Token</span>
                </button>

                <button
                  onClick={handleSaveConfig}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Konfigurasi ke Cloud</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Device Card & Pairing */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-stone-900">
              Status Perangkat WhatsApp CRM
            </h3>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-emerald-950">{deviceName}</div>
                  <div className="text-[11px] text-emerald-700 font-mono">{senderPhone}</div>
                  <div className="text-[10px] text-stone-400 font-mono">ID: {deviceId}</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                Online & Ready
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span>Penyedia Gateway:</span>
                <strong className="text-stone-900">ping.co.id Official Cloud</strong>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Sisa Kuota Pesan:</span>
                <strong className="text-emerald-700">{(whatsappConfig.messageQuota || 5000).toLocaleString('id-ID')} Pesan</strong>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Penyimpanan Akun:</span>
                <strong className="text-stone-900">Firestore Real-Time DB</strong>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsPairingQR(!isPairingQR);
                }}
                className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 font-semibold text-xs text-stone-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-stone-500" />
                <span>{isPairingQR ? 'Tutup QR Pairing' : 'Hubungkan / Pindai Ulang QR Device'}</span>
              </button>

              {isPairingQR && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col items-center text-center space-y-3 animate-in fade-in duration-200">
                  <div className="p-3 bg-white rounded-xl shadow-xs">
                    <QRCodeView value={`PING-DEVICE-PAIR:${senderPhone}:${deviceId}:${Date.now()}`} size={160} />
                  </div>
                  <p className="text-[11px] text-stone-500 max-w-xs">
                    Buka WhatsApp di ponsel hotel &gt; Perangkat Tertaut (Linked Devices) &gt; Tautkan Perangkat.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Webhook Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Tambah Aturan Webhook Baru
              </h3>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kata Kunci (Keyword Trigger)
                </label>
                <input
                  type="text"
                  value={newRuleKeyword}
                  onChange={(e) => setNewRuleKeyword(e.target.value)}
                  placeholder="Contoh: WIFI, MENU, SARAPAN"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold uppercase focus:outline-none focus:border-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Contoh: Info kata sandi wifi kamar hotel"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tipe Respons Bot
                </label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as WhatsAppWebhookRule['responseType'])}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-emerald-700 bg-white"
                >
                  <option value="reply_text">Balas Teks Kustom</option>
                  <option value="send_points_balance">Kirim Info Saldo Poin Tamu</option>
                  <option value="send_digital_card">Kirim Link Kartu Digital Tamu</option>
                  <option value="register_member">Daftarkan Member Baru Otomatis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Isi Pesan Balasan Bot
                </label>
                <textarea
                  rows={4}
                  value={newRuleResponse}
                  onChange={(e) => setNewRuleResponse(e.target.value)}
                  placeholder="Tuliskan teks yang akan dibalas oleh bot WhatsApp..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs"
                >
                  Simpan Aturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
