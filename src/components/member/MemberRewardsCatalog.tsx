import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Gift, Coins, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';

export const MemberRewardsCatalog: React.FC = () => {
  const { currentMember } = useAuth();
  const { rewards, redeemReward } = useApp();
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<{ code: string; title: string } | null>(null);

  const availablePoints = currentMember?.availablePoints || 3250;

  const handleConfirmRedeem = () => {
    if (!selectedReward || !currentMember) return;
    const res = redeemReward(currentMember.id, selectedReward.id);
    if (res.success && res.code) {
      setRedemptionResult({ code: res.code, title: selectedReward.title });
    }
    setSelectedReward(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Katalog Penukaran Reward
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Gunakan saldo poin loyalitas Anda untuk mendapatkan complimentary
            hotel dan hidangan istimewa.
          </p>
        </div>

        <div className="bg-stone-900 text-white px-4 py-2.5 rounded-xl border border-stone-800 flex items-center gap-3">
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-semibold">
              Poin Tersedia Anda
            </div>
            <div className="font-mono text-lg font-bold text-amber-400">
              {availablePoints.toLocaleString('id-ID')} pts
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => {
          const canAfford = availablePoints >= reward.pointsRequired;
          const isAvailable = reward.status === 'active' && reward.stock > 0;

          return (
            <div
              key={reward.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Gift className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-sm font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                    {reward.pointsRequired.toLocaleString('id-ID')} Poin
                  </span>
                </div>

                <h3 className="font-serif-luxury text-base font-bold text-stone-900 mt-4 leading-snug">
                  {reward.title}
                </h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  {reward.description}
                </p>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                  <span>Stok: {reward.stock} kuota</span>
                  <span>Masa aktif: {reward.validityDays} hari</span>
                </div>
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-100">
                <button
                  type="button"
                  disabled={!canAfford || !isAvailable}
                  onClick={() => setSelectedReward(reward)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    !isAvailable
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : canAfford
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs'
                      : 'bg-stone-200 hover:bg-stone-300 text-stone-600'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>
                    {!isAvailable
                      ? 'Stok Habis'
                      : canAfford
                      ? 'Tukarkan Reward'
                      : `Kurang ${(reward.pointsRequired - availablePoints).toLocaleString('id-ID')} Poin`}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {selectedReward && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReward(null)}
          title="Konfirmasi Penukaran Poin"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-base">
                {selectedReward.title}
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                Anda akan menukar{' '}
                <strong className="text-amber-800 font-mono">
                  {selectedReward.pointsRequired} Poin
                </strong>{' '}
                untuk mendapatkan voucher reward ini.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-left text-[11px] text-stone-600 space-y-1">
              <div className="font-semibold text-stone-800">Syarat & Ketentuan:</div>
              <div>{selectedReward.terms}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                className="px-4 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg shadow-xs"
              >
                Tukar Sekarang
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success Result Modal */}
      {redemptionResult && (
        <Modal
          isOpen={true}
          onClose={() => setRedemptionResult(null)}
          title="Penukaran Berhasil!"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center py-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-base">
                {redemptionResult.title}
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                Tunjukkan kode voucher berikut kepada staf resepsionis atau
                restoran hotel:
              </p>
            </div>

            <div className="p-3.5 bg-stone-900 text-amber-400 font-mono text-lg font-bold tracking-widest rounded-xl">
              {redemptionResult.code}
            </div>

            <button
              type="button"
              onClick={() => setRedemptionResult(null)}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold"
            >
              Simpan & Tutup
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
