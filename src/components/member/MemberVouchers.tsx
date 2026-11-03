import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { formatDateIndo, formatIDR } from '../../services/membershipEngine';
import {
  Ticket,
  Sparkles,
  QrCode,
  Tag,
  CheckCircle,
  History,
  CheckCircle2,
  Clock,
  Building2,
  UtensilsCrossed,
  Flower2,
  Receipt,
  ScanLine,
} from 'lucide-react';
import { QRCodeView } from '../common/QRCodeView';
import { Modal } from '../common/Modal';

export const MemberVouchers: React.FC = () => {
  const { currentMember } = useAuth();
  const { vouchers, voucherRedemptions, redemptions, claimVoucher } = useApp();
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [selectedVoucherForQR, setSelectedVoucherForQR] = useState<{
    code: string;
    displayCode?: string;
    title: string;
    description?: string;
    type?: string;
    discountValue?: number;
  } | null>(null);

  const memberId = currentMember?.id || 'mem_john_doe';
  const memberTierId = currentMember?.tierId || 'tier_gold';

  // Set of voucher IDs or codes that have been used by this member
  const usedVoucherIdentifiers = new Set(
    voucherRedemptions
      .filter((vr) => vr.memberId === memberId && vr.status === 'used')
      .flatMap((vr) => [vr.voucherId, vr.voucherCode].filter(Boolean))
  );

  // Available vouchers for this member (excludes already redeemed ones)
  const availableVouchers = vouchers.filter((v) => {
    if (v.status !== 'active') return false;
    if (!v.applicableTierIds.includes(memberTierId)) return false;
    if (usedVoucherIdentifiers.has(v.id) || usedVoucherIdentifiers.has(v.code)) return false;
    if (v.usageLimit && (v.usedCount || 0) >= v.usageLimit) return false;
    return true;
  });

  // Vouchers claimed by member (active / unused)
  const memberClaims = voucherRedemptions.filter(
    (vr) => vr.memberId === memberId && vr.status !== 'used'
  );

  // Reward vouchers from points (active / unredeemed)
  const activeRewardRedemptions = redemptions.filter(
    (r) => r.memberId === memberId && r.status !== 'used'
  );

  // History of used vouchers (Tier vouchers & claimed vouchers)
  const usedVoucherClaims = voucherRedemptions.filter(
    (vr) => vr.memberId === memberId && vr.status === 'used'
  );

  // History of used reward redemptions
  const usedRewardClaims = redemptions.filter(
    (r) => r.memberId === memberId && r.status === 'used'
  );

  const totalUsedCount = usedVoucherClaims.length + usedRewardClaims.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Voucher & Penawaran Saya
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Koleksi kupon diskon eksklusif dan riwayat penggunaan voucher Anda di Lombok Garden Hotel.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'available'
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-emerald-700" />
            <span>Voucher Tersedia</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
              {availableVouchers.length + activeRewardRedemptions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Riwayat Penggunaan</span>
            {totalUsedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-full text-[10px]">
                {totalUsedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ================= TAB 1: AVAILABLE VOUCHERS ================= */}
      {activeTab === 'available' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Section 1: Active Reward Vouchers from Points */}
          {activeRewardRedemptions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Voucher Hasil Penukaran Poin
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeRewardRedemptions.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 bg-gradient-to-r from-stone-900 to-stone-950 text-white rounded-2xl border border-stone-800 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">
                          REWARD VOUCHER · {r.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          Siap Digunakan
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-stone-100 mt-2">
                        {r.rewardTitle}
                      </h4>
                      <div className="font-mono text-xs text-stone-400 mt-2">
                        Kode Barcode: <strong className="text-amber-300 font-bold">{r.redemptionCode}</strong>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 font-mono">
                        Berlaku s/d: {formatDateIndo(r.expiresAt.slice(0, 10))}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedVoucherForQR({
                            code: JSON.stringify({
                              type: 'reward_redemption',
                              code: r.redemptionCode,
                              rewardId: r.rewardId,
                              memberId: memberId,
                              membershipNumber: currentMember?.membershipNumber,
                            }),
                            displayCode: r.redemptionCode,
                            title: r.rewardTitle,
                            description: 'Tunjukkan barcode atau QR ini kepada staf hotel saat pembayaran.',
                          })
                        }
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Tampilkan Barcode/QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Tunjukkan Barcode</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Hotel Exclusive Tier Vouchers */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-700" />
              Kupon Promosi Keanggotaan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableVouchers.map((v) => {
                const hasClaimed = memberClaims.some((c) => c.voucherId === v.id);

                return (
                  <div
                    key={v.id}
                    className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                          {v.type === 'percent'
                            ? `Diskon ${v.discountValue}%`
                            : v.type === 'complimentary'
                            ? 'Complimentary'
                            : `Potongan ${formatIDR(v.discountValue)}`}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          S/d {formatDateIndo(v.expiryDate)}
                        </span>
                      </div>

                      <h3 className="font-bold text-stone-900 text-sm mt-3">
                        {v.title}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {v.description}
                      </p>

                      <div className="mt-3 text-[11px] text-stone-500 font-mono">
                        Kode Kupon: <strong className="text-stone-800 font-bold">{v.code}</strong>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div className="text-[11px] text-stone-400">
                        Min transaksi: {formatIDR(v.minTransaction)}
                      </div>

                      {hasClaimed ? (
                        <button
                          onClick={() =>
                            setSelectedVoucherForQR({
                              code: JSON.stringify({
                                type: 'member_voucher',
                                code: v.code,
                                voucherId: v.id,
                                memberId: memberId,
                                membershipNumber: currentMember?.membershipNumber,
                              }),
                              displayCode: v.code,
                              title: v.title,
                              description: v.description,
                              type: v.type,
                              discountValue: v.discountValue,
                            })
                          }
                          className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Gunakan Barcode</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => claimVoucher(memberId, v.id)}
                          className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Klaim Kupon
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: USED VOUCHER HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>
                Berikut adalah arsip kupon dan voucher yang telah berhasil diverifikasi dan digunakan saat transaksi Anda di hotel.
              </span>
            </div>
            <span className="font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800 shrink-0">
              Total Digunakan: {totalUsedCount}
            </span>
          </div>

          {totalUsedCount === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-stone-800 text-base">
                Belum Ada Voucher yang Digunakan
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Voucher promosi dan reward poin yang Anda klaim dan redeem di kasir restoran atau front desk akan tercatat di halaman ini secara otomatis.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('available')}
                className="mt-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Lihat Voucher Tersedia
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Used Tier / Promo Vouchers */}
              {usedVoucherClaims.map((vr) => {
                const voucherDef = vouchers.find((v) => v.id === vr.voucherId || v.code === vr.voucherCode);

                return (
                  <div
                    key={vr.id}
                    className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-700" />
                      <span>TELAH DIGUNAKAN</span>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                        Kupon Promosi Keanggotaan
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm mt-1 pr-24">
                        {voucherDef?.title || `Voucher ${vr.voucherCode}`}
                      </h4>
                      <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                        {voucherDef?.description || 'Potongan harga menginap atau bersantap.'}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">
                            Kode Voucher:
                          </span>
                          <span className="font-mono font-bold text-stone-800">
                            {vr.voucherCode}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">
                            Nilai Diskon:
                          </span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {voucherDef?.type === 'percent'
                              ? `Diskon ${voucherDef.discountValue}%`
                              : formatIDR(vr.discountApplied || voucherDef?.discountValue || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>Digunakan pada:</span>
                        </span>
                        <span className="font-mono text-stone-700 font-semibold">
                          {formatDateIndo(vr.usedAt ? vr.usedAt.slice(0, 10) : vr.claimedAt.slice(0, 10))}
                        </span>
                      </div>

                      {vr.outlet && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-stone-400" />
                            <span>Lokasi / Outlet:</span>
                          </span>
                          <span className="font-semibold text-stone-800">
                            {vr.outlet}
                          </span>
                        </div>
                      )}

                      {vr.redeemedByStaffName && (
                        <div className="flex items-center justify-between">
                          <span>Divalidasi Oleh:</span>
                          <span className="text-stone-700">
                            {vr.redeemedByStaffName} ({vr.redeemedByStaffRole || 'Staff'})
                          </span>
                        </div>
                      )}

                      {vr.transactionNumber && (
                        <div className="flex items-center justify-between font-mono text-[10px] pt-1 text-stone-400">
                          <span>Ref Tagihan:</span>
                          <span className="font-bold text-stone-600">
                            #{vr.transactionNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Used Reward Vouchers from points */}
              {usedRewardClaims.map((r) => (
                <div
                  key={r.id}
                  className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-700" />
                    <span>TELAH DIGUNAKAN</span>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-amber-700 uppercase tracking-wider font-semibold">
                      Reward Poin · Complimentary
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm mt-1 pr-24">
                      {r.rewardTitle}
                    </h4>

                    <div className="mt-3 bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-xs">
                      <span className="text-[10px] text-stone-400 block font-medium">
                        Kode Barcode Voucher:
                      </span>
                      <span className="font-mono font-bold text-stone-800">
                        {r.redemptionCode}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>Waktu Penggunaan:</span>
                      </span>
                      <span className="font-mono text-stone-700 font-semibold">
                        {formatDateIndo(r.usedAt ? r.usedAt.slice(0, 10) : r.redeemedAt.slice(0, 10))}
                      </span>
                    </div>

                    {r.notes && (
                      <div className="text-[10px] text-stone-400 italic pt-1">
                        {r.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR & Barcode Voucher View Modal */}
      {selectedVoucherForQR && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVoucherForQR(null)}
          title="Tunjukkan Voucher ke Staff Hotel"
          maxWidth="sm"
        >
          <div className="text-center py-4 space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs inline-block mx-auto">
              <QRCodeView value={selectedVoucherForQR.code} size={190} />
            </div>

            {/* Visual Simulated 1D Barcode Strip for Handheld Guns */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center justify-center gap-0.5 h-10 px-4 bg-white rounded border border-stone-300 overflow-hidden">
                {/* Visual barcode stripes */}
                {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1].map(
                  (w, i) => (
                    <span
                      key={i}
                      className="bg-black h-full inline-block"
                      style={{ width: `${w * 2}px`, marginRight: `${(i % 3) + 1}px` }}
                    />
                  )
                )}
              </div>
              <div className="font-mono text-base font-bold text-stone-900 tracking-widest mt-1.5">
                {selectedVoucherForQR.displayCode || selectedVoucherForQR.code}
              </div>
            </div>

            <div>
              <div className="font-bold text-stone-900 text-sm">
                {selectedVoucherForQR.title}
              </div>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                Staff Front Desk atau Kasir Restoran/Spa akan memindai barcode ini menggunakan Barcode Scanner untuk otomatis memotong tagihan.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
