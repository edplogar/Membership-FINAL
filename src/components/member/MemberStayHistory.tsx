import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { formatDateIndo, formatIDR } from '../../services/membershipEngine';
import { BedDouble, Calendar, User, CheckCircle2, Clock } from 'lucide-react';

export const MemberStayHistory: React.FC = () => {
  const { currentMember } = useAuth();
  const { stays } = useApp();

  const memberId = currentMember?.id || 'mem_john_doe';
  const memberStays = stays.filter((s) => s.memberId === memberId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      <div>
        <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
          Riwayat Kunjungan Menginap
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Daftar seluruh pengalaman menginap Anda di Lombok Garden Hotel.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {memberStays.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            Belum ada data kunjungan menginap
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {memberStays.map((stay) => {
              const isPast = stay.status === 'checked_out';
              const isCurrent = stay.status === 'checked_in';

              return (
                <div key={stay.id} className="p-6 hover:bg-stone-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <BedDouble className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-stone-900 text-sm">
                            Kamar {stay.roomNumber} · {stay.roomType}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                              isCurrent
                                ? 'bg-amber-100 text-amber-800'
                                : isPast
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {stay.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            {formatDateIndo(stay.checkInDate)} s/d{' '}
                            {formatDateIndo(stay.checkOutDate)} ({stay.nights} Malam)
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-stone-400" />
                            {stay.guestCount} Tamu
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-stone-400">Total Biaya</div>
                      <div className="font-mono font-bold text-stone-900 text-sm mt-0.5">
                        {formatIDR(stay.totalAmount)}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                        Booking ID: {stay.bookingNumber}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
