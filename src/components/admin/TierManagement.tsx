import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MembershipTier } from '../../types';
import { formatIDR } from '../../services/membershipEngine';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Sparkles,
  Check,
  Percent,
  Coins,
} from 'lucide-react';

export const TierManagement: React.FC = () => {
  const { tiers, saveTier, deleteTier, members } = useApp();

  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [tierToDelete, setTierToDelete] = useState<MembershipTier | null>(null);

  const defaultNewTier: MembershipTier = {
    id: `tier_${Date.now()}`,
    name: 'Diamond VIP',
    level: tiers.length + 1,
    minSpending: 75000000,
    minStays: 20,
    minNights: 35,
    pointMultiplier: 2.5,
    roomDiscountPercent: 25,
    fnbDiscountPercent: 25,
    spaDiscountPercent: 30,
    benefits: [
      'Diskon Kamar 25% & Spa 30%',
      'Presidential Suite Upgrade Priority',
      'Dedicated Butler Service 24 Jam',
      'Free Unlimited Airport Transfer',
    ],
    colorHex: '#4f46e5',
    badgeBg: 'bg-indigo-900 text-indigo-100',
    icon: 'Crown',
    validityMonths: 24,
    description: 'Tier keistimewaan tertinggi untuk tamu VIP spesial.',
    isActive: true,
  };

  const handleEdit = (tier: MembershipTier) => {
    setEditingTier({ ...tier, benefits: [...tier.benefits] });
  };

  const handleAdd = () => {
    setEditingTier({ ...defaultNewTier, id: `tier_${Date.now()}` });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    saveTier(editingTier);
    setEditingTier(null);
  };

  const handleBenefitChange = (index: number, value: string) => {
    if (!editingTier) return;
    const newBenefits = [...editingTier.benefits];
    newBenefits[index] = value;
    setEditingTier({ ...editingTier, benefits: newBenefits });
  };

  const handleAddBenefit = () => {
    if (!editingTier) return;
    setEditingTier({
      ...editingTier,
      benefits: [...editingTier.benefits, 'Benefit Baru'],
    });
  };

  const handleRemoveBenefit = (index: number) => {
    if (!editingTier) return;
    const newBenefits = editingTier.benefits.filter((_, i) => i !== index);
    setEditingTier({ ...editingTier, benefits: newBenefits });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Konfigurasi Tier Membership
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Atur syarat spending, kunjungan, multiplier poin, dan benefit eksklusif
            untuk setiap tingkatan member secara dinamis tanpa mengubah source code.
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Tier Baru</span>
        </button>
      </div>

      {/* Tiers List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tiers.map((tier) => {
          const memberCount = members.filter((m) => m.tierId === tier.id).length;

          return (
            <div
              key={tier.id}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                      style={{ backgroundColor: tier.colorHex }}
                    >
                      <Sparkles className="w-5 h-5 text-amber-200" />
                    </div>
                    <div>
                      <h3 className="font-serif-luxury text-lg font-bold text-stone-900">
                        {tier.name}
                      </h3>
                      <div className="text-[11px] font-mono text-stone-500">
                        Level {tier.level} · {memberCount} Member Terdaftar
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(tier)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Edit Tier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {tiers.length > 1 && (
                      <button
                        onClick={() => setTierToDelete(tier)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-600 mt-3 leading-relaxed">
                  {tier.description}
                </p>

                {/* Requirements Grid */}
                <div className="mt-4 grid grid-cols-3 gap-2.5 p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                  <div>
                    <div className="text-[10px] text-stone-400 font-semibold uppercase">
                      Min Spending
                    </div>
                    <div className="font-mono font-bold text-stone-900 mt-0.5">
                      {formatIDR(tier.minSpending)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400 font-semibold uppercase">
                      Min Stays
                    </div>
                    <div className="font-mono font-bold text-stone-900 mt-0.5">
                      {tier.minStays}x Kunjungan
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400 font-semibold uppercase">
                      Multiplier Poin
                    </div>
                    <div className="font-mono font-bold text-amber-700 mt-0.5">
                      {tier.pointMultiplier}x Lipat
                    </div>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] uppercase font-bold text-stone-400 tracking-wider">
                    Privilese & Keuntungan ({tier.benefits.length})
                  </div>
                  <ul className="space-y-1.5 text-xs text-stone-700">
                    {tier.benefits.slice(0, 4).map((b, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: tier.colorHex }}
                        />
                        <span className="truncate">{b}</span>
                      </li>
                    ))}
                    {tier.benefits.length > 4 && (
                      <li className="text-[11px] text-stone-400 italic pl-3.5">
                        +{tier.benefits.length - 4} keuntungan lainnya...
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span>Masa berlaku: {tier.validityMonths} bulan</span>
                <button
                  onClick={() => handleEdit(tier)}
                  className="font-semibold text-emerald-800 hover:underline"
                >
                  Konfigurasi Benefit →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Tier Modal */}
      {editingTier && (
        <Modal
          isOpen={true}
          onClose={() => setEditingTier(null)}
          title={`Konfigurasi Tier: ${editingTier.name}`}
          subtitle="Modifikasi aturan kualifikasi, persentase diskon, dan daftar benefit"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Tier *
                </label>
                <input
                  type="text"
                  value={editingTier.name}
                  onChange={(e) =>
                    setEditingTier({ ...editingTier, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Level Urutan (1 = Terendah)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingTier.level}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      level: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Syarat Minimum Spending (IDR)
                </label>
                <input
                  type="number"
                  step="500000"
                  value={editingTier.minSpending}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      minSpending: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Syarat Minimum Kunjungan (Stay Count)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingTier.minStays}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      minStays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Multiplier Poin Loyalitas (cth: 1.5x)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="5.0"
                  value={editingTier.pointMultiplier}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      pointMultiplier: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Warna Tema Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingTier.colorHex}
                    onChange={(e) =>
                      setEditingTier({ ...editingTier, colorHex: e.target.value })
                    }
                    className="w-9 h-9 rounded-lg border border-stone-200 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingTier.colorHex}
                    onChange={(e) =>
                      setEditingTier({ ...editingTier, colorHex: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Diskon Kamar (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingTier.roomDiscountPercent}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      roomDiscountPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Masa Berlaku Tier (Bulan)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={editingTier.validityMonths}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      validityMonths: parseInt(e.target.value) || 12,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Deskripsi Singkat Tier
                </label>
                <input
                  type="text"
                  value={editingTier.description}
                  onChange={(e) =>
                    setEditingTier({ ...editingTier, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Benefits Dynamic List Editor */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-800">
                  Daftar Benefit yang Diberikan:
                </label>
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Benefit
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {editingTier.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleBenefitChange(index, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(index)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setEditingTier(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs"
              >
                Simpan Konfigurasi Tier
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(tierToDelete)}
        onClose={() => setTierToDelete(null)}
        onConfirm={() => {
          if (tierToDelete) deleteTier(tierToDelete.id);
          setTierToDelete(null);
        }}
        title={`Hapus Tier ${tierToDelete?.name}?`}
        message="Menghapus tier ini akan mempengaruhi kualifikasi member yang ada pada tier tersebut."
        confirmText="Hapus Tier"
        isDestructive
      />
    </div>
  );
};
