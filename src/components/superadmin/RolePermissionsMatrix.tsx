import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PermissionCode, Role } from '../../types';
import { Lock, Shield, Check, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PermissionGroup {
  groupName: string;
  permissions: { code: PermissionCode; label: string; desc: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    groupName: 'Member Management',
    permissions: [
      { code: 'member.view', label: 'Lihat Daftar Member', desc: 'Melihat tabel dan profil member hotel' },
      { code: 'member.create', label: 'Tambah Member Baru', desc: 'Mendaftarkan akun tamu keanggotaan baru' },
      { code: 'member.edit', label: 'Edit Data Member', desc: 'Mengubah profil, kontak, alamat, dan data pribadi' },
      { code: 'member.delete', label: 'Hapus / Nonaktifkan Member', desc: 'Menghapus atau menonaktifkan keanggotaan member' },
      { code: 'member.tier_change', label: 'Ubah Tier Manual', desc: 'Mengubah level tier tanpa menunggu rule engine' },
    ],
  },
  {
    groupName: 'Tier, Benefit & Rule Engine',
    permissions: [
      { code: 'tier.view', label: 'Lihat Konfigurasi Tier', desc: 'Melihat daftar dan syarat tingkatan tier' },
      { code: 'tier.create', label: 'Tambah Tier Baru', desc: 'Membuat tingkatan keanggotaan baru' },
      { code: 'tier.edit', label: 'Edit Syarat & Diskon Tier', desc: 'Mengubah diskon kamar, F&B, spa, dan multiplier' },
      { code: 'tier.delete', label: 'Hapus Tier', desc: 'Menghapus tingkatan tier keanggotaan' },
      { code: 'benefit.view', label: 'Lihat Katalog Benefit', desc: 'Melihat daftar fasilitas & hak istimewa' },
      { code: 'benefit.edit', label: 'Kelola Katalog Benefit', desc: 'Menambah atau mengedit fasilitas keanggotaan' },
      { code: 'rule.view', label: 'Lihat Aturan Rule Engine', desc: 'Melihat formula otomatis upgrade/downgrade' },
      { code: 'rule.edit', label: 'Edit Formula Rule Engine', desc: 'Mengubah ambang batas spending dan nights' },
    ],
  },
  {
    groupName: 'Kunjungan Menginap (Stay)',
    permissions: [
      { code: 'stay.view', label: 'Lihat Daftar Stay', desc: 'Melihat data check-in dan riwayat menginap tamu' },
      { code: 'stay.create', label: 'Catat Kunjungan Menginap', desc: 'Input reservasi, kamar, dan check-in member' },
      { code: 'stay.edit', label: 'Ubah Data Kunjungan Menginap', desc: 'Update nomor kamar, tanggal check-out, status stay' },
    ],
  },
  {
    groupName: 'Transaksi & Kasir Belanja',
    permissions: [
      { code: 'transaction.view', label: 'Lihat Riwayat Transaksi', desc: 'Melihat transaksi kamar, resto, spa, dan bar' },
      { code: 'transaction.create', label: 'Catat Transaksi Belanja', desc: 'Input tagihan pembelanjaan untuk perolehan poin' },
    ],
  },
  {
    groupName: 'Poin & Loyalitas Tamu',
    permissions: [
      { code: 'points.view', label: 'Lihat Buku Besar Poin', desc: 'Melihat mutasi poin masuk dan keluar seluruh member' },
      { code: 'points.adjust', label: 'Sesuaikan Poin Manual', desc: 'Menambah atau memotong saldo poin member secara manual' },
    ],
  },
  {
    groupName: 'Reward, Voucher & Promosi',
    permissions: [
      { code: 'reward.view', label: 'Lihat Katalog Hadiah', desc: 'Melihat stok dan daftar reward poin' },
      { code: 'reward.edit', label: 'Kelola Katalog Hadiah', desc: 'Menambah dan mengedit hadiah penukaran poin' },
      { code: 'voucher.view', label: 'Lihat Daftar Voucher', desc: 'Melihat kupon promosi aktif & riwayat klaim' },
      { code: 'voucher.create', label: 'Terbitkan Voucher Baru', desc: 'Membuat kode kupon diskon dan promosi' },
      { code: 'voucher.edit', label: 'Kelola & Nonaktifkan Voucher', desc: 'Mengubah kuota dan masa berlaku voucher' },
      { code: 'voucher.delete', label: 'Hapus Voucher', desc: 'Menghapus kupon voucher dari sistem' },
      { code: 'voucher.redeem', label: 'Redeem & Gunakan Voucher', desc: 'Memvalidasi penukaran kupon member di kasir / Front Desk' },
      { code: 'voucher.scan_only', label: 'Pindai Scan Voucher', desc: 'Izin verifikasi voucher tamu melalui scanner kamera' },
      { code: 'promotion.view', label: 'Lihat Kampanye Promosi', desc: 'Melihat promo musiman dan multiplier aktif' },
      { code: 'promotion.edit', label: 'Kelola Kampanye Promosi', desc: 'Mengatur bonus multiplier dan tanggal promo' },
    ],
  },
  {
    groupName: 'Laporan Bisnis & Audit Trail',
    permissions: [
      { code: 'reports.view', label: 'Lihat Laporan Bisnis', desc: 'Melihat analisis revenue, pergerakan tier, dan KPI' },
      { code: 'reports.export', label: 'Ekspor Data CSV', desc: 'Mengunduh laporan transaksi dan member ke file CSV' },
      { code: 'audit.view', label: 'Lihat Audit Security Trail', desc: 'Melihat log rekam jejak aktivitas staf dan perubahan data' },
    ],
  },
  {
    groupName: 'Pengaturan Sistem & Akun Administrator',
    permissions: [
      { code: 'settings.view', label: 'Lihat Pengaturan Sistem', desc: 'Melihat profil hotel, email hub, dan integrasi WhatsApp' },
      { code: 'settings.edit', label: 'Edit Pengaturan Sistem', desc: 'Mengubah gateway SMTP, API key, dan konfigurasi hotel' },
      { code: 'admin.view', label: 'Lihat Akun Administrator', desc: 'Melihat daftar pengguna staf hotel' },
      { code: 'admin.create', label: 'Buat Akun Administrator', desc: 'Mendaftarkan akun staf dan admin baru' },
      { code: 'admin.edit', label: 'Edit Akun Administrator', desc: 'Mengubah username, email, dan peran staf' },
      { code: 'admin.delete', label: 'Hapus Akun Administrator', desc: 'Menghapus akses akun staf hotel' },
      { code: 'security.manage', label: 'Kelola Matriks RBAC', desc: 'Mengubah izin peran dan konfigurasi keamanan granular' },
    ],
  },
];

export const RolePermissionsMatrix: React.FC = () => {
  const { roles, updateRolePermissions } = useApp();
  const { showToast } = useToast();

  const [selectedRoleId, setSelectedRoleId] = useState<string>('role_hotel_admin');
  const targetRole = roles.find((r) => r.id === selectedRoleId) || roles.find((r) => r.code !== 'MEMBER') || roles[0];

  const [selectedPerms, setSelectedPerms] = useState<PermissionCode[]>(
    targetRole ? targetRole.permissions : []
  );

  React.useEffect(() => {
    if (targetRole) {
      setSelectedPerms(targetRole.permissions);
    }
  }, [selectedRoleId, roles]);

  const togglePermission = (code: PermissionCode) => {
    if (targetRole && targetRole.code === 'SUPER_ADMIN') {
      showToast('Peran Super Administrator selalu memiliki seluruh hak akses secara default.', 'warning');
      return;
    }

    if (selectedPerms.includes(code)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== code));
    } else {
      setSelectedPerms([...selectedPerms, code]);
    }
  };

  const handleSave = () => {
    if (!targetRole) return;
    updateRolePermissions(targetRole.id, selectedPerms);
  };

  const selectAll = () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.code));
    setSelectedPerms(all);
  };

  const clearAll = () => {
    setSelectedPerms([]);
  };

  const totalPossiblePerms = PERMISSION_GROUPS.reduce((acc, g) => acc + g.permissions.length, 0);
  const activeCount = targetRole?.code === 'SUPER_ADMIN' ? totalPossiblePerms : selectedPerms.length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Matriks Hak Akses Granular (RBAC)
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Konfigurasi izin terperinci untuk setiap peran pengguna di lingkungan Lombok Garden Hotel.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan Hak Akses</span>
        </button>
      </div>

      {/* Role Picker Banner */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-stone-700">Pilih Peran:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {roles
              .filter((r) => r.code !== 'MEMBER')
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedRoleId === r.id
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {r.name} ({r.code})
                </button>
              ))}
          </div>
        </div>

        {targetRole && targetRole.code !== 'SUPER_ADMIN' && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectAll}
              className="text-emerald-800 font-semibold hover:underline cursor-pointer"
            >
              Pilih Semua
            </button>
            <span className="text-stone-300">·</span>
            <button
              onClick={clearAll}
              className="text-stone-500 font-semibold hover:underline cursor-pointer"
            >
              Kosongkan
            </button>
          </div>
        )}
      </div>

      {/* Role Info Summary Card */}
      {targetRole && (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-emerald-950 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Peran: {targetRole.name}</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900 font-bold">
                {targetRole.code}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 mt-1">
              {targetRole.description}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 font-mono">
            <span className="text-stone-600 text-[11px]">Izin Aktif:</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-bold text-xs">
              {activeCount} / {totalPossiblePerms}
            </span>
          </div>
        </div>
      )}

      {/* Permissions Matrix by Group */}
      <div className="space-y-6">
        {PERMISSION_GROUPS.map((group) => (
          <div
            key={group.groupName}
            className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 font-bold text-xs uppercase tracking-wider text-stone-700">
              {group.groupName}
            </div>

            <div className="divide-y divide-stone-100">
              {group.permissions.map((perm) => {
                const isChecked =
                  targetRole.code === 'SUPER_ADMIN' ||
                  selectedPerms.includes(perm.code);

                return (
                  <label
                    key={perm.code}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50/50 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-xs text-stone-900 flex items-center gap-2">
                        <span>{perm.label}</span>
                        <span className="font-mono text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                          {perm.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {perm.desc}
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={targetRole.code === 'SUPER_ADMIN'}
                      onChange={() => togglePermission(perm.code)}
                      className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700/20 cursor-pointer disabled:opacity-50"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
