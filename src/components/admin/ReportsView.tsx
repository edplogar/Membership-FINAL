import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import { exportToCSV } from '../../services/exportService';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  Users,
  TrendingUp,
  Coins,
  BedDouble,
  Ticket,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    members,
    tiers,
    transactions,
    stays,
    pointTransactions,
    vouchers,
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'members' | 'revenue' | 'loyalty' | 'stays'>('revenue');

  // Revenue metrics
  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Revenue by tier
  const revenueByTier = tiers.map((tier) => {
    const tierMemberIds = members.filter((m) => m.tierId === tier.id).map((m) => m.id);
    const amount = transactions
      .filter((tx) => tierMemberIds.includes(tx.memberId))
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { tier, amount };
  });

  // Revenue by category
  const categories = ['room', 'restaurant', 'spa', 'bar', 'other'] as const;
  const revenueByCategory = categories.map((cat) => {
    const amount = transactions
      .filter((tx) => tx.category === cat)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { category: cat, amount };
  });

  // Points metrics
  const pointsIssued = pointTransactions
    .filter((pt) => pt.amount > 0)
    .reduce((sum, pt) => sum + pt.amount, 0);

  const pointsRedeemed = Math.abs(
    pointTransactions
      .filter((pt) => pt.amount < 0)
      .reduce((sum, pt) => sum + pt.amount, 0)
  );

  const outstandingPoints = members.reduce((sum, m) => sum + m.availablePoints, 0);

  // Export current report to CSV
  const handleExport = () => {
    if (activeReportTab === 'revenue') {
      const headers = ['Kategori', 'Total Pendapatan (IDR)', 'Kontribusi (%)'];
      const rows = revenueByCategory.map((r) => [
        r.category.toUpperCase(),
        r.amount,
        totalRevenue > 0 ? `${((r.amount / totalRevenue) * 100).toFixed(1)}%` : '0%',
      ]);
      exportToCSV('LGH_Laporan_Pendapatan_Kategori', headers, rows);
    } else if (activeReportTab === 'members') {
      const headers = ['Tier', 'Jumlah Member', 'Persentase (%)'];
      const rows = tiers.map((t) => {
        const count = members.filter((m) => m.tierId === t.id).length;
        return [
          t.name,
          count,
          members.length > 0 ? `${((count / members.length) * 100).toFixed(1)}%` : '0%',
        ];
      });
      exportToCSV('LGH_Laporan_Distribusi_Member', headers, rows);
    } else if (activeReportTab === 'loyalty') {
      const headers = ['Metrik', 'Nilai Poin'];
      const rows = [
        ['Total Poin Diterbitkan', pointsIssued],
        ['Total Poin Ditebus Tamu', pointsRedeemed],
        ['Saldo Poin Beredar (Outstanding)', outstandingPoints],
      ];
      exportToCSV('LGH_Laporan_Poin_Loyalitas', headers, rows);
    } else {
      const headers = ['No. Booking', 'Tamu', 'Kamar', 'Malam', 'Biaya', 'Status'];
      const rows = stays.map((s) => {
        const m = members.find((mem) => mem.id === s.memberId);
        return [s.bookingNumber, m?.fullName || '-', s.roomNumber, s.nights, s.totalAmount, s.status];
      });
      exportToCSV('LGH_Laporan_Kunjungan_Menginap', headers, rows);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Laporan Kinerja & Analisis Bisnis
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Data analitik menyeluruh mencakup pertumbuhan member, pendapatan per kategori, dan perputaran poin.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor Laporan Aktif (CSV)</span>
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveReportTab('revenue')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'revenue'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Laporan Pendapatan</span>
        </button>
        <button
          onClick={() => setActiveReportTab('members')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'members'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Laporan Member & Tier</span>
        </button>
        <button
          onClick={() => setActiveReportTab('loyalty')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'loyalty'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Laporan Poin Loyalitas</span>
        </button>
        <button
          onClick={() => setActiveReportTab('stays')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'stays'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <BedDouble className="w-3.5 h-3.5" />
          <span>Laporan Menginap</span>
        </button>
      </div>

      {/* REPORT CONTENT: Revenue */}
      {activeReportTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Category */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 mb-4">
                Pendapatan per Kategori Layanan Hotel
              </h3>
              <div className="space-y-3">
                {revenueByCategory.map((item) => {
                  const percent = totalRevenue > 0 ? ((item.amount / totalRevenue) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800 capitalize">
                          {item.category}
                        </span>
                        <span className="font-mono text-stone-700 font-bold">
                          {formatIDR(item.amount)} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-800 h-2 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Tier */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 mb-4">
                Kontribusi Pendapatan per Tier Keanggotaan
              </h3>
              <div className="space-y-3">
                {revenueByTier.map(({ tier, amount }) => {
                  const percent = totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : '0';
                  return (
                    <div key={tier.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800">
                          {tier.name} Tier
                        </span>
                        <span className="font-mono text-stone-700 font-bold">
                          {formatIDR(amount)} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full"
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
          </div>
        </div>
      )}

      {/* REPORT CONTENT: Members */}
      {activeReportTab === 'members' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-stone-900">
            Sebaran Populasi Member Berdasarkan Tier
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {tiers.map((t) => {
              const count = members.filter((m) => m.tierId === t.id).length;
              return (
                <div key={t.id} className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase">
                    {t.name} (Lvl {t.level})
                  </div>
                  <div className="font-mono text-2xl font-bold text-stone-900 mt-1">
                    {count} Tamu
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1 font-mono">
                    {((count / members.length) * 100).toFixed(0)}% dari total member
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REPORT CONTENT: Loyalty */}
      {activeReportTab === 'loyalty' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-stone-900">
            Perputaran & Liabilitas Poin Loyalitas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-xs text-emerald-800 font-semibold uppercase">
                Poin Diterbitkan
              </div>
              <div className="font-mono text-2xl font-bold text-emerald-900 mt-1">
                +{pointsIssued.toLocaleString('id-ID')} pts
              </div>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <div className="text-xs text-rose-800 font-semibold uppercase">
                Poin Ditebus (Redeemed)
              </div>
              <div className="font-mono text-2xl font-bold text-rose-900 mt-1">
                -{pointsRedeemed.toLocaleString('id-ID')} pts
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="text-xs text-amber-800 font-semibold uppercase">
                Saldo Poin Aktif (Outstanding)
              </div>
              <div className="font-mono text-2xl font-bold text-amber-900 mt-1">
                {outstandingPoints.toLocaleString('id-ID')} pts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: Stays */}
      {activeReportTab === 'stays' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-stone-900">
            Statistik Kunjungan Menginap
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
              <div className="text-xs text-stone-500 font-semibold uppercase">
                Total Menginap
              </div>
              <div className="font-mono text-2xl font-bold text-stone-900 mt-1">
                {stays.length} Reservasi
              </div>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
              <div className="text-xs text-stone-500 font-semibold uppercase">
                Total Room Nights
              </div>
              <div className="font-mono text-2xl font-bold text-stone-900 mt-1">
                {stays.reduce((acc, s) => acc + s.nights, 0)} Malam
              </div>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
              <div className="text-xs text-stone-500 font-semibold uppercase">
                Rata-rata Durasi
              </div>
              <div className="font-mono text-2xl font-bold text-stone-900 mt-1">
                {(stays.reduce((acc, s) => acc + s.nights, 0) / (stays.length || 1)).toFixed(1)} Malam
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
