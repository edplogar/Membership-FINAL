import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import { DashboardWidget } from './DashboardWidget';
import {
  Users,
  Building2,
  Receipt,
  Coins,
  Ticket,
  TrendingUp,
  Award,
  Sparkles,
  QrCode,
  UserPlus,
  BedDouble,
  ChevronRight,
  ArrowUpRight,
  ScanLine,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenAddMember: () => void;
  onOpenVoucherScanner?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenScanner,
  onOpenAddMember,
  onOpenVoucherScanner,
}) => {
  const { hasPermission } = useAuth();
  const {
    members,
    tiers,
    stays,
    transactions,
    pointTransactions,
    vouchers,
    auditLogs,
  } = useApp();

  // Metrics calculation
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'ACTIVE').length;
  const totalVisits = stays.length;
  const totalRevenue = transactions.reduce((acc, tx) => acc + tx.amount, 0);

  const pointsIssued = pointTransactions
    .filter((pt) => pt.amount > 0)
    .reduce((acc, pt) => acc + pt.amount, 0);

  const pointsRedeemed = Math.abs(
    pointTransactions
      .filter((pt) => pt.amount < 0)
      .reduce((acc, pt) => acc + pt.amount, 0)
  );

  const activeVouchers = vouchers.filter((v) => v.status === 'active').length;

  // Tier distribution calculation
  const tierCounts = tiers.map((tier) => ({
    tier,
    count: members.filter((m) => m.tierId === tier.id).length,
  }));

  // Revenue by category
  const categories = ['room', 'restaurant', 'spa', 'bar', 'other'] as const;
  const revenueByCategory = categories.map((cat) => {
    const total = transactions
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return { category: cat, total };
  });

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      {/* Top Header & Fast Operations Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif-luxury text-xs uppercase tracking-widest text-emerald-800 font-bold">
              Manajemen Operasional
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-xs text-stone-500 font-mono">
              Lombok Garden Hotel
            </span>
          </div>
          <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            Dashboard Membership & Loyalitas
          </h1>
        </div>

        {/* Quick Operations CTA */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenScanner}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Pindai QR Tamu</span>
          </button>

          {onOpenVoucherScanner && (hasPermission('voucher.redeem') || hasPermission('voucher.scan_only')) && (
            <button
              onClick={onOpenVoucherScanner}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              <span>Redeem Voucher</span>
            </button>
          )}

          {hasPermission('member.create') && (
            <button
              onClick={onOpenAddMember}
              className="px-4 py-2.5 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Member Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs uppercase font-semibold">Total Member</span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="font-mono text-2xl font-bold text-stone-900 mt-2">
            {totalMembers}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1 font-mono">
            <span className="text-emerald-700 font-semibold">{activeMembers} Aktif</span>
            <span>· 100% Terverifikasi</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs uppercase font-semibold">Total Transaksi</span>
            <Receipt className="w-4 h-4 text-amber-700" />
          </div>
          <div className="font-mono text-2xl font-bold text-stone-900 mt-2">
            Rp {(totalRevenue / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            {transactions.length} tagihan tercatat
          </div>
        </div>

        {/* Stays & Visits */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs uppercase font-semibold">Kunjungan Stay</span>
            <BedDouble className="w-4 h-4 text-stone-700" />
          </div>
          <div className="font-mono text-2xl font-bold text-stone-900 mt-2">
            {totalVisits} Stay
          </div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            Rata-rata 3.2 malam / kunjungan
          </div>
        </div>

        {/* Loyalty Points Ratio */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs uppercase font-semibold">Poin Loyalitas</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-700 mt-2">
            +{pointsIssued.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            Redeemed: -{pointsRedeemed.toLocaleString('id-ID')} pts
          </div>
        </div>
      </div>

      {/* Daily Active Members & New Sign-ups Chart Widget */}
      <DashboardWidget
        title="Tren Aktivitas & Pertumbuhan Member"
        subtitle="Analisis pergerakan member aktif harian dan pendaftaran member baru (Lombok Garden Hotel)"
        defaultDays={7}
      />

      {/* Visual Distribution & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Tier Distribution Bar Breakdown */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <h3 className="font-serif-luxury font-bold text-base text-stone-900">
                Distribusi Tier Keanggotaan
              </h3>
            </div>
            <button
              onClick={() => onNavigate('admin_tiers')}
              className="text-xs text-emerald-800 hover:underline font-semibold"
            >
              Atur Syarat Tier →
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {tierCounts.map(({ tier, count }) => {
              const percent = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
              return (
                <div key={tier.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tier.colorHex }}
                      />
                      {tier.name} Tier (Level {tier.level})
                    </span>
                    <span className="font-mono text-stone-600 font-semibold">
                      {count} Member ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: tier.colorHex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Category Breakdown */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <h3 className="font-serif-luxury font-bold text-base text-stone-900">
                Pendapatan Member per Kategori
              </h3>
            </div>
            <button
              onClick={() => onNavigate('admin_transactions')}
              className="text-xs text-emerald-800 hover:underline font-semibold"
            >
              Semua Transaksi →
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {revenueByCategory.map(({ category, total }) => {
              const percent = totalRevenue > 0 ? Math.round((total / totalRevenue) * 100) : 0;
              return (
                <div key={category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 capitalize">
                      {category}
                    </span>
                    <span className="font-mono text-stone-700 font-semibold">
                      {formatIDR(total)} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-800 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operational Feed & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
            <h3 className="font-serif-luxury font-bold text-base text-stone-900">
              Transaksi Member Terkini
            </h3>
            <button
              onClick={() => onNavigate('admin_transactions')}
              className="text-xs text-emerald-800 hover:underline font-semibold"
            >
              Kelola Transaksi
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 text-stone-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3 text-right">Jumlah</th>
                  <th className="px-5 py-3 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transactions.slice(0, 6).map((tx) => {
                  const member = members.find((m) => m.id === tx.memberId);
                  return (
                    <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-stone-900">
                          {member?.fullName || 'Tamu'}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {member?.membershipNumber}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="capitalize font-medium text-stone-700">
                          {tx.category}
                        </span>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {tx.paymentMethod}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-stone-900">
                        {formatIDR(tx.amount)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-700">
                        +{tx.pointsEarned} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Audit Log Snip */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
            <h3 className="font-serif-luxury font-bold text-base text-stone-900">
              Audit Aktivitas Terbaru
            </h3>
            <button
              onClick={() => onNavigate('admin_audit')}
              className="text-xs text-emerald-800 hover:underline font-semibold"
            >
              Log Lengkap
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 hover:bg-stone-50/60 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-900 font-mono text-[11px]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-xs text-stone-600 mt-1 line-clamp-2">
                  {log.newValue}
                </div>
                <div className="text-[10px] text-stone-400 font-mono mt-1">
                  Oleh: {log.userName} ({log.userRole})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
