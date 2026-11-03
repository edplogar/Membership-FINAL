import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Member, Transaction, Stay, Voucher } from '../../types';
import { Modal } from './Modal';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import { Search, User, Receipt, BedDouble, Ticket, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember: (m: Member) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMember,
}) => {
  const { members, transactions, stays, vouchers } = useApp();
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedMembers = q
    ? members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.membershipNumber.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.email.toLowerCase().includes(q)
      )
    : [];

  const matchedTransactions = q
    ? transactions.filter(
        (t) =>
          t.transactionNumber.toLowerCase().includes(q) ||
          t.referenceNumber.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    : [];

  const matchedStays = q
    ? stays.filter(
        (s) =>
          s.bookingNumber.toLowerCase().includes(q) ||
          s.roomNumber.includes(q) ||
          s.roomType.toLowerCase().includes(q)
      )
    : [];

  const matchedVouchers = q
    ? vouchers.filter(
        (v) =>
          v.code.toLowerCase().includes(q) ||
          v.title.toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    matchedMembers.length +
    matchedTransactions.length +
    matchedStays.length +
    matchedVouchers.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pencarian Global Lombok Garden Hotel"
      subtitle="Cari member, nomor kartu, transaksi, reservasi kamar, atau kode voucher"
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Ketik kata kunci (cth: John, LGH-001088, Kamar 308, WELCOME)..."
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        {!q ? (
          <div className="py-8 text-center text-xs text-stone-400">
            Ketik minimal 1 karakter untuk memulai pencarian di seluruh database
          </div>
        ) : totalResults === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            Tidak ditemukan data yang cocok dengan "{query}"
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-4 divide-y divide-stone-100 text-xs">
            {/* Members Section */}
            {matchedMembers.length > 0 && (
              <div className="space-y-2 pt-2 first:pt-0">
                <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                  <User className="w-3 h-3 text-emerald-700" />
                  <span>Member Tamu ({matchedMembers.length})</span>
                </div>
                {matchedMembers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectMember(m);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-stone-900">{m.fullName}</div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {m.membershipNumber} · {m.phone} · {m.availablePoints} pts
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                ))}
              </div>
            )}

            {/* Transactions Section */}
            {matchedTransactions.length > 0 && (
              <div className="space-y-2 pt-3">
                <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3 h-3 text-amber-700" />
                  <span>Transaksi Belanja ({matchedTransactions.length})</span>
                </div>
                {matchedTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-stone-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-stone-900 font-mono">
                        {tx.transactionNumber}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {formatDateIndo(tx.date)} · Kategori: {tx.category}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-stone-900">
                      {formatIDR(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Stays Section */}
            {matchedStays.length > 0 && (
              <div className="space-y-2 pt-3">
                <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                  <BedDouble className="w-3 h-3 text-stone-700" />
                  <span>Kunjungan Menginap ({matchedStays.length})</span>
                </div>
                {matchedStays.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-stone-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-stone-900">
                        Kamar {s.roomNumber} ({s.roomType})
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        Booking: {s.bookingNumber} · {s.nights} Malam
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-stone-100 text-stone-700">
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Vouchers Section */}
            {matchedVouchers.length > 0 && (
              <div className="space-y-2 pt-3">
                <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                  <Ticket className="w-3 h-3 text-emerald-700" />
                  <span>Voucher & Kupon ({matchedVouchers.length})</span>
                </div>
                {matchedVouchers.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-xl bg-stone-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-stone-900">{v.title}</div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        Kode: {v.code} · Exp: {formatDateIndo(v.expiryDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
