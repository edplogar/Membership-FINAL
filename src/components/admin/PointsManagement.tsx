import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Member } from '../../types';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import { Modal } from '../common/Modal';
import { MemberSearchSelect } from '../common/MemberSearchSelect';
import { Coins, Plus, Minus, Settings, ShieldAlert, History } from 'lucide-react';

interface PointsManagementProps {
  preselectedMember?: Member | null;
  isOpenAdjustModal?: boolean;
  onCloseAdjustModal?: () => void;
}

export const PointsManagement: React.FC<PointsManagementProps> = ({
  preselectedMember,
  isOpenAdjustModal = false,
  onCloseAdjustModal,
}) => {
  const {
    pointTransactions,
    members,
    tiers,
    pointRules,
    adjustPoints,
    savePointRules,
  } = useApp();

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = isOpenAdjustModal || internalModalOpen;
  const handleCloseModal = () => {
    setInternalModalOpen(false);
    if (onCloseAdjustModal) onCloseAdjustModal();
  };

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Adjust Points Form State
  const [adjustForm, setAdjustForm] = useState({
    memberId: preselectedMember?.id || (members[0]?.id || ''),
    amount: 500,
    isAddition: true,
    reason: 'Goodwill service recovery atas kendala teknis AC kamar',
  });

  React.useEffect(() => {
    if (preselectedMember) {
      setAdjustForm((prev) => ({ ...prev, memberId: preselectedMember.id }));
    }
  }, [preselectedMember]);

  // Point rules configuration form state
  const [configForm, setConfigForm] = useState({ ...pointRules });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustPoints(
      adjustForm.memberId,
      adjustForm.amount,
      adjustForm.isAddition,
      adjustForm.reason
    );
    handleCloseModal();
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    savePointRules(configForm);
    setIsConfigOpen(false);
  };

  const targetMember = members.find((m) => m.id === adjustForm.memberId) || members[0];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00A651]/15 text-[#00A651] border border-[#00A651]/30">
              Loyalty & Rewards
            </span>
            <span className="text-xs text-stone-400">·</span>
            <span className="text-xs text-stone-500 font-medium">Hotel Guest Points</span>
          </div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900 mt-1">
            Manajemen Poin & Loyalitas Tamu
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Penyesuaian manual saldo poin tamu dengan catatan audit serta konfigurasi
            rasio perolehan poin per transaksi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-stone-500" />
            <span>Aturan Perhitungan Poin</span>
          </button>

          <button
            onClick={() => setInternalModalOpen(true)}
            className="px-4 py-2 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>+ Penyesuaian Manual Poin</span>
          </button>
        </div>
      </div>

      {/* Rules Summary Card */}
      <div className="p-6 bg-gradient-to-r from-[#072417] via-[#0A3320] to-[#04160E] text-white rounded-2xl border border-[#0E4029] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00A651]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="text-[10px] font-mono text-[#C5A869] uppercase tracking-widest font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A869]" />
            KONFIGURASI LOYALITAS AKTIF
          </div>
          <h3 className="font-serif-luxury text-lg font-bold mt-1 text-white">
            {formatIDR(pointRules.rupiahPerPoint)} Belanja = 1 Poin Loyalitas
          </h3>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl leading-relaxed">
            Bonus Ulang Tahun: +{pointRules.birthdayBonusPoints} pts · Bonus
            Referral: +{pointRules.referralBonusReferrer} pts · Kadaluwarsa Poin:{' '}
            {pointRules.pointExpiryMonths} bulan
          </p>
        </div>

        <button
          onClick={() => setIsConfigOpen(true)}
          className="relative z-10 px-4 py-2.5 bg-[#00A651]/20 hover:bg-[#00A651]/30 text-[#4ADE80] border border-[#00A651]/40 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
        >
          Ubah Formula Poin
        </button>
      </div>

      {/* Points Ledger / Audit Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-500" />
            <h3 className="font-bold text-sm text-stone-900">
              Buku Besar Perubahan Poin Tamu
            </h3>
          </div>
          <span className="text-xs text-stone-400 font-mono">
            {pointTransactions.length} entri tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3">Nama Member</th>
                <th className="px-5 py-3">Alasan / Deskripsi</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3 text-right">Perubahan Poin</th>
                <th className="px-5 py-3 text-right">Saldo Akhir</th>
                <th className="px-5 py-3">Staf Pelaksana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {pointTransactions.map((item) => {
                const member = members.find((m) => m.id === item.memberId);
                const isPositive = item.amount > 0;
                return (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono text-stone-400 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-stone-900">
                        {member?.fullName || 'Tamu'}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {member?.membershipNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-stone-700 max-w-xs">
                      {item.description}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-[10px] uppercase font-semibold text-stone-500">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }
                      >
                        {isPositive ? `+${item.amount}` : item.amount} pts
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-stone-800">
                      {item.balanceAfter} pts
                    </td>
                    <td className="px-5 py-3 text-stone-500 font-mono text-[11px]">
                      {item.staffName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Points Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Penyesuaian Manual Poin Tamu"
        subtitle="Setiap perubahan saldo manual akan dicatat dalam audit trail keamanan hotel"
        maxWidth="lg"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <MemberSearchSelect
              members={members}
              tiers={tiers}
              selectedMemberId={adjustForm.memberId}
              onSelectMember={(m) =>
                setAdjustForm({ ...adjustForm, memberId: m.id })
              }
              label="Pilih & Cari Member Tamu"
              placeholder="Cari nama member, no. kartu, atau no. HP..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Aksi Penyesuaian
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustForm({ ...adjustForm, isAddition: true })}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    adjustForm.isAddition
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustForm({ ...adjustForm, isAddition: false })}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    !adjustForm.isAddition
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Kurang (-)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Jumlah Poin *
              </label>
              <input
                type="number"
                min="1"
                step="10"
                value={adjustForm.amount}
                onChange={(e) =>
                  setAdjustForm({
                    ...adjustForm,
                    amount: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Alasan Audit / Justifikasi Penyesuaian *
            </label>
            <textarea
              rows={3}
              value={adjustForm.reason}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, reason: e.target.value })
              }
              placeholder="Contoh: Service recovery kendala internet, koreksi transaksi bill sebelumnya..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              required
            />
          </div>

          {/* Balance Preview */}
          {targetMember && (
            <div className="p-3 bg-stone-100 rounded-xl text-xs text-stone-600 flex items-center justify-between">
              <span>
                Saldo Saat Ini: <strong>{targetMember.availablePoints} pts</strong>
              </span>
              <span className="font-semibold text-stone-900">
                Saldo Baru:{' '}
                {adjustForm.isAddition
                  ? targetMember.availablePoints + adjustForm.amount
                  : Math.max(0, targetMember.availablePoints - adjustForm.amount)}{' '}
                pts
              </span>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
            >
              Simpan Penyesuaian Poin
            </button>
          </div>
        </form>
      </Modal>

      {/* Global Point Config Modal */}
      {isConfigOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsConfigOpen(false)}
          title="Konfigurasi Rasio Poin Loyalitas Global"
          subtitle="Aturan perolehan poin berlaku otomatis untuk seluruh transaksi baru"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Rupiah Belanja per 1 Poin (IDR) *
                </label>
                <input
                  type="number"
                  step="1000"
                  value={configForm.rupiahPerPoint}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      rupiahPerPoint: parseInt(e.target.value) || 10000,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Minimal Nilai Transaksi (IDR)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={configForm.minTransactionAmount}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      minTransactionAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bonus Ulang Tahun Member (Poin)
                </label>
                <input
                  type="number"
                  value={configForm.birthdayBonusPoints}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      birthdayBonusPoints: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bonus Referral Pengajak (Poin)
                </label>
                <input
                  type="number"
                  value={configForm.referralBonusReferrer}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      referralBonusReferrer: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bonus Referral Member Baru (Poin)
                </label>
                <input
                  type="number"
                  value={configForm.referralBonusNewMember}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      referralBonusNewMember: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Masa Berlaku Poin (Bulan)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={configForm.pointExpiryMonths}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      pointExpiryMonths: parseInt(e.target.value) || 12,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs"
              >
                Simpan Perubahan Aturan Poin
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
