import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { formatDateIndo } from '../../services/membershipEngine';
import { Coins, ArrowDownLeft, ArrowUpRight, Filter, Calendar } from 'lucide-react';

export const MemberPointsHistory: React.FC = () => {
  const { currentMember } = useAuth();
  const { pointTransactions } = useApp();
  const [filterType, setFilterType] = useState<string>('all');

  const memberId = currentMember?.id || 'mem_john_doe';
  const availablePoints = currentMember?.availablePoints || 3250;
  const totalEarned = currentMember?.totalPointsEarned || 4312;
  const totalRedeemed = currentMember?.redeemedPoints || 1062;

  const history = pointTransactions
    .filter((pt) => pt.memberId === memberId)
    .filter((pt) => {
      if (filterType === 'earned') return pt.amount > 0;
      if (filterType === 'redeemed') return pt.amount < 0;
      return true;
    });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
          Riwayat Poin Loyalitas
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Pantau seluruh aktivitas perolehan dan penukaran poin keanggotaan Anda.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900 text-white p-5 rounded-2xl shadow-xs border border-stone-800">
          <div className="text-xs text-stone-400 font-medium uppercase tracking-wider">
            Poin Tersedia
          </div>
          <div className="font-mono text-3xl font-extrabold text-amber-400 mt-1">
            {availablePoints.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-stone-400 ml-1.5">pts</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-2">
            Siap ditukar dengan kamar, santapan & spa
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-stone-200">
          <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">
            Total Poin Diperoleh
          </div>
          <div className="font-mono text-3xl font-bold text-emerald-700 mt-1">
            +{totalEarned.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-stone-500 mt-2">
            Dari menginap, restoran, dan aktivitas
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-stone-200">
          <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">
            Poin Ditukarkan
          </div>
          <div className="font-mono text-3xl font-bold text-stone-800 mt-1">
            -{totalRedeemed.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-stone-500 mt-2">
            Sebagai diskon voucher dan reward
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Semua Aktivitas
        </button>
        <button
          onClick={() => setFilterType('earned')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'earned'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Poin Masuk
        </button>
        <button
          onClick={() => setFilterType('redeemed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'redeemed'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Poin Keluar (Redeem)
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            Tidak ada transaksi poin pada kategori ini
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Deskripsi Transaksi</th>
                  <th className="px-5 py-3.5">Tipe</th>
                  <th className="px-5 py-3.5 text-right">Perubahan Poin</th>
                  <th className="px-5 py-3.5 text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {history.map((item) => {
                  const isPositive = item.amount > 0;
                  return (
                    <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-stone-500 whitespace-nowrap">
                        {formatDateIndo(item.createdAt.slice(0, 10))}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          Oleh: {item.staffName}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono uppercase text-[10px] text-stone-500">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${item.amount}` : item.amount} pts
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-stone-700">
                        {item.balanceAfter} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
