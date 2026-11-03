import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MEMBER_CUSTOM_DOMAIN, FIRESTORE_DATABASE_ID } from '../../services/domainService';
import { Save, Building2, Shield, Globe, Cpu, Bell, Check, Server, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface SystemSettingsViewProps {
  onNavigate?: (tab: string) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ onNavigate }) => {
  const { systemSettings, updateSystemSettings, integrations } = useApp();
  const { showToast } = useToast();
  const [form, setForm] = useState({ ...systemSettings });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings(form);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Pengaturan Sistem & Konfigurasi Hotel
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Konfigurasi identitas properti hotel, otomatisasi mesin keanggotaan,
            kebijakan keamanan, dan integrasi API.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Seluruh Pengaturan</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 0: Subdomain Custom & Centralized Sync Notification Reference */}
        <div className="bg-gradient-to-br from-[#072417] to-[#0D3823] rounded-2xl border border-emerald-900 shadow-sm p-6 text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00A651]/20 border border-[#00A651]/40 flex items-center justify-center text-[#4ADE80]">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Subdomain Custom Front End Tamu</span>
                  <span className="w-2 h-2 rounded-full bg-[#00A651]" />
                </h3>
                <p className="text-[11px] text-emerald-200/70 font-mono">
                  {MEMBER_CUSTOM_DOMAIN}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kendali & Notifikasi Sync: Menu Control Center</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/20 border border-emerald-900/60 space-y-1">
              <span className="text-emerald-300/70 text-[11px] block">Alamat Subdomain Custom</span>
              <strong className="text-white font-mono text-xs">{MEMBER_CUSTOM_DOMAIN}</strong>
              <span className="text-[10px] text-emerald-400 block">Status: Terarah ke Front End</span>
            </div>

            <div className="p-3 rounded-xl bg-black/20 border border-emerald-900/60 space-y-1">
              <span className="text-emerald-300/70 text-[11px] block">ID Database Firestore</span>
              <strong className="text-white font-mono text-[11px] truncate block" title={FIRESTORE_DATABASE_ID}>
                {FIRESTORE_DATABASE_ID}
              </strong>
              <span className="text-[10px] text-emerald-400 block">Status: Terhubung Cloud</span>
            </div>

            <div className="p-3 rounded-xl bg-black/20 border border-emerald-900/60 space-y-1">
              <span className="text-emerald-300/70 text-[11px] block">Pusat Notifikasi & Sinkronisasi</span>
              <strong className="text-white text-xs block">Menu "Control Center"</strong>
              <span className="text-[10px] text-emerald-300/80 block">Notifikasi & aksi sync aktif khusus di menu Control Center</span>
            </div>
          </div>

          {onNavigate && (
            <div className="mt-4 pt-3 border-t border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/30 p-3.5 rounded-xl border border-emerald-500/30">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Deployment NevaCloud VPS (Ubuntu/Debian)
                  </span>
                  <span className="text-[10px] text-emerald-300/80 block">
                    Script installer otomatis, konfigurasi Nginx reverse proxy, dan PM2 cluster manager.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('super_nevacloud')}
                className="px-3.5 py-1.5 bg-[#00A651] hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span>Buka Pusat Deploy VPS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Section 1: Hotel Property Identity */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider">
              Identitas Properti Hotel
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Resmi Hotel *
              </label>
              <input
                type="text"
                value={form.hotelName}
                onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Teks Logo / Wordmark
              </label>
              <input
                type="text"
                value={form.logoText}
                onChange={(e) => setForm({ ...form, logoText: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Alamat Lengkap Hotel
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nomor Telepon Hotline
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Membership & Support
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Regional & Membership Engine Rules */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Cpu className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider">
              Otomatisasi Mesin Keanggotaan
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mata Uang & Simbol
              </label>
              <input
                type="text"
                value={`${form.currency} (${form.currencySymbol})`}
                disabled
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Zona Waktu Operasional
              </label>
              <input
                type="text"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Masa Berlaku Default Kartu (Bulan)
              </label>
              <input
                type="number"
                value={form.membershipValidityMonths}
                onChange={(e) =>
                  setForm({
                    ...form,
                    membershipValidityMonths: parseInt(e.target.value) || 24,
                  })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Batas Sesi Login (Menit)
              </label>
              <input
                type="number"
                value={form.sessionTimeoutMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sessionTimeoutMinutes: parseInt(e.target.value) || 60,
                  })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoUpgradeEnabled}
                onChange={(e) =>
                  setForm({ ...form, autoUpgradeEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700/20"
              />
              <span className="text-xs text-stone-800 font-semibold">
                Aktifkan Auto-Upgrade Tier Otomatis (Saat transaksi atau stay memenuhi syarat)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowPublicRegistration}
                onChange={(e) =>
                  setForm({ ...form, allowPublicRegistration: e.target.checked })
                }
                className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700/20"
              />
              <span className="text-xs text-stone-800 font-semibold">
                Izinkan Tamu Mendaftar Sendiri Melalui Web Portal Publik
              </span>
            </label>
          </div>
        </div>

        {/* Section 3: Integrations & External Gateways */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Globe className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider">
              Gateway WhatsApp CRM & Layanan Notifikasi
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900">
                  {integrations.whatsappPing.name}
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Connected
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                Kirim pesan notifikasi kartu digital otomatis, info poin, dan ucapan naik tier ke nomor WhatsApp tamu.
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900">
                  {integrations.emailService.name}
                </span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Connected
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                Pengiriman email konfirmasi dan ringkasan statement poin tamu.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
