import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Sparkles, Check, Lock, Award, BedDouble, Utensils, Flower2 } from 'lucide-react';
import { formatIDR } from '../../services/membershipEngine';

export const MemberBenefits: React.FC = () => {
  const { currentMember } = useAuth();
  const { tiers } = useApp();

  const currentTierId = currentMember?.tierId || 'tier_gold';
  const currentTier = tiers.find((t) => t.id === currentTierId) || tiers[0];

  const sortedTiers = [...tiers].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Keistimewaan Tingkat Keanggotaan</span>
        </div>
        <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-stone-900">
          Benefit & Tingkatan Member
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          Tingkatkan terus frekuensi kunjungan atau akumulasi transaksi Anda di
          Lombok Garden Hotel untuk membuka berbagai privilese eksklusif.
        </p>
      </div>

      {/* Tier Cards Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {sortedTiers.map((tier) => {
          const isCurrent = tier.id === currentTier.id;
          const isUnlocked = currentTier.level >= tier.level;

          return (
            <div
              key={tier.id}
              className={`rounded-2xl flex flex-col justify-between p-6 transition-all duration-200 relative ${
                isCurrent
                  ? 'bg-stone-900 text-white ring-2 ring-amber-400 shadow-xl'
                  : 'bg-white text-stone-900 border border-stone-200 shadow-xs'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-950 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  Tier Anda Saat Ini
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      className={`font-serif-luxury text-lg font-bold ${
                        isCurrent ? 'text-amber-300' : 'text-stone-900'
                      }`}
                    >
                      {tier.name}
                    </h3>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                      Level {tier.level}
                    </div>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isUnlocked
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {isUnlocked ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Qualification Requirement */}
                <div
                  className={`mt-4 pt-3 border-t text-xs ${
                    isCurrent ? 'border-stone-800' : 'border-stone-100'
                  }`}
                >
                  <div className="text-[10px] uppercase font-semibold text-stone-400">
                    Syarat Kualifikasi
                  </div>
                  <div className="font-medium mt-0.5">
                    {tier.minSpending > 0 ? (
                      <span>
                        Spending {formatIDR(tier.minSpending)} atau {tier.minStays}x Stay
                      </span>
                    ) : (
                      <span>Gratis Pendaftaran Pertama</span>
                    )}
                  </div>
                </div>

                {/* Key Discounts Banner */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                  <div
                    className={`p-2 rounded-lg ${
                      isCurrent ? 'bg-stone-800' : 'bg-stone-50'
                    }`}
                  >
                    <div className="text-[10px] text-stone-400">Diskon Kamar</div>
                    <div className="font-mono font-bold text-amber-500">
                      {tier.roomDiscountPercent}%
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-lg ${
                      isCurrent ? 'bg-stone-800' : 'bg-stone-50'
                    }`}
                  >
                    <div className="text-[10px] text-stone-400">Multiplier Poin</div>
                    <div className="font-mono font-bold text-amber-500">
                      {tier.pointMultiplier}x
                    </div>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="mt-5 space-y-2.5">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">
                    Benefit yang Didapat:
                  </div>
                  <ul className="space-y-2 text-xs">
                    {tier.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                        <span
                          className={`leading-relaxed ${
                            isCurrent ? 'text-stone-200' : 'text-stone-700'
                          }`}
                        >
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Status footer */}
              <div
                className={`mt-6 pt-4 border-t text-center text-xs font-semibold ${
                  isCurrent ? 'border-stone-800' : 'border-stone-100'
                }`}
              >
                {isCurrent ? (
                  <span className="text-amber-400">Tier Aktif</span>
                ) : isUnlocked ? (
                  <span className="text-emerald-700">Telah Terbuka</span>
                ) : (
                  <span className="text-stone-400">Belum Memenuhi Syarat</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hospitality Terms */}
      <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 text-xs text-stone-500 space-y-2 max-w-4xl mx-auto">
        <h4 className="font-bold text-stone-800">
          Ketentuan Benefit Member Lombok Garden Hotel:
        </h4>
        <p>
          1. Room upgrade dan early check-in/late check-out tergantung pada
          ketersediaan kamar pada saat kedatangan.
        </p>
        <p>
          2. Diskon kamar dan F&B berlaku untuk transaksi langsung di hotel atau
          website resmi hotel.
        </p>
        <p>
          3. Poin loyalitas berlaku selama 24 bulan sejak tanggal perolehan
          transaksi.
        </p>
      </div>
    </div>
  );
};
