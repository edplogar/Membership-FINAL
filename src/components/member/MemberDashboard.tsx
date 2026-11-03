import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { DigitalMembershipCard } from './DigitalMembershipCard';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import {
  Sparkles,
  Coins,
  BedDouble,
  Receipt,
  Ticket,
  ChevronRight,
  Gift,
  Tag,
  Clock,
  CheckCircle,
} from 'lucide-react';

interface MemberDashboardProps {
  onNavigate: (tab: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ onNavigate }) => {
  const { currentMember, currentUser } = useAuth();
  const {
    tiers,
    transactions,
    stays,
    rewards,
    vouchers,
    promotions,
    redeemReward,
    claimVoucher,
  } = useApp();

  // If no member found, fall back to first member for preview
  const member = currentMember || {
    id: 'mem_john_doe',
    membershipNumber: 'LGH-001088',
    fullName: 'Johnathan Doe',
    nickname: 'John',
    email: 'member@example.com',
    phone: '+62 812-3456-7890',
    gender: 'L' as const,
    birthDate: '1988-06-15',
    address: 'Jl. Sunset Road No. 88, Kuta',
    city: 'Denpasar',
    province: 'Bali',
    country: 'Indonesia',
    idCardNumber: '3201123456780001',
    registrationDate: '2025-01-10',
    membershipStartDate: '2025-01-10',
    membershipEndDate: '2027-01-10',
    tierId: 'tier_gold',
    status: 'ACTIVE' as const,
    totalVisits: 9,
    totalTransactions: 14,
    totalSpending: 28750000,
    totalPointsEarned: 4312,
    availablePoints: 3250,
    redeemedPoints: 1062,
    referralCode: 'JOHN-LGH',
    internalNotes: '',
  };

  const currentTier = tiers.find((t) => t.id === member.tierId) || tiers[0];
  const sortedTiers = [...tiers].sort((a, b) => a.level - b.level);
  const nextTier = sortedTiers.find((t) => t.level === currentTier.level + 1);

  // Member's recent transactions
  const memberTransactions = transactions
    .filter((tx) => tx.memberId === member.id)
    .slice(0, 4);

  // Member's recent stays
  const memberStays = stays
    .filter((s) => s.memberId === member.id)
    .slice(0, 3);

  // Eligible promotions
  const activePromos = promotions.filter(
    (p) => p.status === 'active' && p.applicableTierIds.includes(currentTier.id)
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-emerald-950 via-stone-900 to-teal-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-emerald-900/60 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 text-emerald-200 text-xs font-semibold mb-3 border border-emerald-700/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Lombok Garden Hospitality Privileges</span>
          </div>
          <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold tracking-tight">
            Selamat Datang Kembali, {member.nickname || member.fullName.split(' ')[0]}
          </h1>
          <p className="text-stone-300 text-sm mt-1.5 max-w-xl leading-relaxed">
            Terima kasih telah menjadi bagian dari keluarga istimewa Lombok Garden Hotel.
            Gunakan kartu digital Anda untuk menikmati beragam benefit eksklusif.
          </p>
        </div>

        {/* Quick Points Widget */}
        <div className="relative z-10 shrink-0 bg-stone-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-stone-700/80 text-right">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
            Saldo Poin Loyalitas
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
            {member.availablePoints.toLocaleString('id-ID')}
            <span className="text-xs text-stone-400 font-normal ml-1">pts</span>
          </div>
          <button
            onClick={() => onNavigate('points')}
            className="mt-3 text-xs font-semibold text-stone-200 hover:text-amber-300 flex items-center justify-end gap-1 transition-colors"
          >
            <span>Tukar Hadiah</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Card & Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Digital Membership Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
              Kartu Member Digital
            </h2>
            <button
              onClick={() => onNavigate('membership')}
              className="text-xs text-emerald-800 hover:underline font-semibold"
            >
              Lihat Detail
            </button>
          </div>

          <DigitalMembershipCard
            member={member}
            tier={currentTier}
            nextTier={nextTier}
            onViewBenefits={() => onNavigate('benefits')}
          />

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs text-center">
              <div className="text-[10px] text-stone-500 uppercase font-semibold">
                Kunjungan
              </div>
              <div className="text-base font-bold text-stone-900 font-mono mt-0.5">
                {member.totalVisits}x
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs text-center">
              <div className="text-[10px] text-stone-500 uppercase font-semibold">
                Total Belanja
              </div>
              <div className="text-base font-bold text-stone-900 font-mono mt-0.5">
                Rp {(member.totalSpending / 1000000).toFixed(1)}Jt
              </div>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs text-center">
              <div className="text-[10px] text-stone-500 uppercase font-semibold">
                Multiplier
              </div>
              <div className="text-base font-bold text-amber-700 font-mono mt-0.5">
                {currentTier.pointMultiplier}x Poin
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Key Privileges & Quick Actions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Benefits Overview */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900 font-serif-luxury">
                  Benefit Aktif ({currentTier.name} Tier)
                </h3>
              </div>
              <button
                onClick={() => onNavigate('benefits')}
                className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold"
              >
                Semua Benefit →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentTier.benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-100"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-800 font-medium leading-relaxed">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Promotional Campaigns */}
          {activePromos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-rose-600" />
                  Promo Eksklusif Member
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePromos.map((promo) => (
                  <div
                    key={promo.id}
                    className={`bg-linear-to-br ${promo.gradientBg} text-white p-4.5 rounded-2xl border border-white/10 shadow-xs flex flex-col justify-between`}
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 font-mono">
                        {promo.discountText || 'Special Offer'}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        {promo.title}
                      </h4>
                      <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                        {promo.description}
                      </p>
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono mt-3 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Hingga {formatDateIndo(promo.endDate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity: Stays & Transactions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Recent Stays */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-emerald-700" />
                  Kunjungan Menginap
                </h4>
                <button
                  onClick={() => onNavigate('history')}
                  className="text-[11px] text-stone-500 hover:text-stone-900"
                >
                  Semua
                </button>
              </div>

              {memberStays.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400">
                  Belum ada catatan stay menginap
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {memberStays.map((stay) => (
                    <div key={stay.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800">
                          Kamar {stay.roomNumber}
                        </span>
                        <span className="font-mono text-emerald-800 font-bold">
                          {stay.nights} Malam
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {stay.roomType}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {formatDateIndo(stay.checkInDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-700" />
                  Transaksi Terakhir
                </h4>
                <button
                  onClick={() => onNavigate('points')}
                  className="text-[11px] text-stone-500 hover:text-stone-900"
                >
                  Semua
                </button>
              </div>

              {memberTransactions.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400">
                  Belum ada riwayat transaksi
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {memberTransactions.map((tx) => (
                    <div key={tx.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800 capitalize">
                          {tx.category}
                        </span>
                        <span className="font-mono font-bold text-stone-900">
                          {formatIDR(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-0.5">
                        <span className="text-stone-400 font-mono">
                          {formatDateIndo(tx.date)}
                        </span>
                        <span className="text-emerald-700 font-mono font-semibold">
                          +{tx.pointsEarned} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
