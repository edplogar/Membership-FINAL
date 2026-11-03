import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { UniversalBarcodeScanner } from '../common/UniversalBarcodeScanner';
import { Voucher, Member, VoucherRedemption } from '../../types';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  UserCheck,
  Building2,
  UtensilsCrossed,
  Flower2,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check,
  Receipt,
  ScanLine,
} from 'lucide-react';

interface VoucherScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOutlet?: 'Front Desk' | 'Restaurant & Bar' | 'Spa & Wellness';
  onRedeemSuccess?: (result: { voucher: Voucher; member?: Member; redemption: VoucherRedemption }) => void;
}

export const VoucherScannerModal: React.FC<VoucherScannerModalProps> = ({
  isOpen,
  onClose,
  defaultOutlet = 'Front Desk',
  onRedeemSuccess,
}) => {
  const { verifyVoucherByBarcode, redeemVoucherByBarcode } = useApp();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [selectedOutlet, setSelectedOutlet] = useState<'Front Desk' | 'Restaurant & Bar' | 'Spa & Wellness'>(defaultOutlet);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Scanned verification state
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    status: 'available' | 'used' | 'expired' | 'not_found';
    voucher?: Voucher;
    member?: Member;
    redemption?: VoucherRedemption;
    message: string;
    scannedCode: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [redeemedRecord, setRedeemedRecord] = useState<{
    voucher: Voucher;
    member?: Member;
    redemption: VoucherRedemption;
  } | null>(null);

  const handleScanCode = (code: string) => {
    const verified = verifyVoucherByBarcode(code);
    setVerificationResult({
      ...verified,
      scannedCode: code,
    });

    if (verified.isValid) {
      showToast(`Voucher "${verified.voucher?.title}" siap diredeem.`, 'info');
    } else {
      showToast(verified.message, 'error');
    }
  };

  const handleConfirmRedeem = () => {
    if (!verificationResult || !verificationResult.voucher) return;

    setIsProcessing(true);
    const staffName = currentUser?.name || 'Staff Resepsionis';
    const staffRole = currentUser?.role || 'Hotel Staff';

    const result = redeemVoucherByBarcode(verificationResult.scannedCode, {
      name: staffName,
      role: staffRole,
      outlet: selectedOutlet,
      transactionNumber: transactionNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsProcessing(false);

    if (result.success && result.voucher && result.redemption) {
      setRedeemedRecord({
        voucher: result.voucher,
        member: result.member,
        redemption: result.redemption,
      });

      if (onRedeemSuccess) {
        onRedeemSuccess({
          voucher: result.voucher,
          member: result.member,
          redemption: result.redemption,
        });
      }
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
    setRedeemedRecord(null);
    setTransactionNumber('');
    setNotes('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Validasi & Redeem Voucher Tamu"
      subtitle="Pindai QR code atau Barcode voucher milik tamu untuk memproses diskon"
      maxWidth="lg"
    >
      <div className="space-y-5 py-1">
        {/* ================= SUCCESS RECEIPT VIEW ================= */}
        {redeemedRecord ? (
          <div className="bg-[#FAF9F5] border border-emerald-300 rounded-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md border-2 border-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Voucher Berhasil Digunakan (Redeemed)
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-900 mt-2">
                {redeemedRecord.voucher.title}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Kode: <strong className="font-mono text-stone-800">{redeemedRecord.voucher.code}</strong>
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-stone-200 text-xs text-left space-y-2.5 max-w-md mx-auto shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-stone-500">Nama Tamu / Member:</span>
                <span className="font-bold text-stone-900">{redeemedRecord.member?.fullName || 'Tamu Hotel'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-stone-500">Nomor Member:</span>
                <span className="font-mono font-semibold text-stone-800">{redeemedRecord.member?.membershipNumber || '-'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-stone-500">Outlet Penukaran:</span>
                <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{selectedOutlet}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-stone-500">Nilai Manfaat / Diskon:</span>
                <span className="font-bold text-emerald-700">
                  {redeemedRecord.voucher.type === 'percent'
                    ? `Diskon ${redeemedRecord.voucher.discountValue}%`
                    : redeemedRecord.voucher.type === 'complimentary'
                    ? 'Complimentary'
                    : `Potongan ${formatIDR(redeemedRecord.voucher.discountValue)}`}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-stone-500">Waktu Redeem:</span>
                <span className="font-mono text-stone-700">{formatDateIndo(new Date().toISOString().slice(0, 10))} · {new Date().toLocaleTimeString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Staf Validator:</span>
                <span className="font-semibold text-stone-800">{currentUser?.name || 'Staff Resepsionis'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center gap-2"
              >
                <ScanLine className="w-4 h-4" />
                <span>Pindai Voucher Lain</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ================= OUTLET SELECTION TABS ================= */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Pilih Lokasi / Outlet Penukaran:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOutlet('Front Desk')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedOutlet === 'Front Desk'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs font-bold'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Front Desk (FO)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOutlet('Restaurant & Bar')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedOutlet === 'Restaurant & Bar'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs font-bold'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Restoran & Bar (FB)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOutlet('Spa & Wellness')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedOutlet === 'Spa & Wellness'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs font-bold'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Flower2 className="w-4 h-4" />
                  <span>Spa & Wellness</span>
                </button>
              </div>
            </div>

            {/* ================= UNIVERSAL SCANNER VIEWPORT ================= */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <UniversalBarcodeScanner
                onScan={handleScanCode}
                title="Pindai Barcode / QR Voucher"
                placeholder="Arahkan kamera ke Barcode / QR Code Voucher Tamu"
              />
            </div>

            {/* ================= VERIFICATION RESULT CARD ================= */}
            {verificationResult && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Status Alert */}
                {verificationResult.isValid ? (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-950 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            Voucher Valid & Siap Digunakan
                          </span>
                          <h4 className="font-bold text-sm text-stone-900 mt-0.5">
                            {verificationResult.voucher?.title}
                          </h4>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                        {verificationResult.voucher?.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-emerald-200 text-xs">
                      <div>
                        <span className="text-stone-500 text-[11px]">Tamu Pemilik:</span>
                        <div className="font-bold text-stone-800">
                          {verificationResult.member?.fullName || 'Tamu Hotel'}
                        </div>
                        <div className="text-[10px] font-mono text-stone-400">
                          {verificationResult.member?.membershipNumber}
                        </div>
                      </div>

                      <div>
                        <span className="text-stone-500 text-[11px]">Manfaat Kupon:</span>
                        <div className="font-bold text-emerald-800">
                          {verificationResult.voucher?.type === 'percent'
                            ? `Diskon ${verificationResult.voucher.discountValue}%`
                            : verificationResult.voucher?.type === 'complimentary'
                            ? 'Complimentary'
                            : `Potongan ${formatIDR(verificationResult.voucher?.discountValue || 0)}`}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          Min Transaksi: {formatIDR(verificationResult.voucher?.minTransaction || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Additional Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          No. Bill / Kamar / Referensi (Opsional)
                        </label>
                        <input
                          type="text"
                          value={transactionNumber}
                          onChange={(e) => setTransactionNumber(e.target.value)}
                          placeholder="BILL-9901 atau Kamar 304"
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Catatan Tambahan (Opsional)
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Menu santapan / paket spa"
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={handleConfirmRedeem}
                      disabled={isProcessing}
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isProcessing ? 'Memproses Redeem...' : 'Konfirmasi Redeem Voucher Ini'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm">
                          {verificationResult.status === 'used'
                            ? 'Voucher Sudah Pernah Digunakan!'
                            : verificationResult.status === 'expired'
                            ? 'Voucher Telah Kedaluwarsa!'
                            : 'Voucher Tidak Valid / Tidak Ditemukan'}
                        </div>
                        <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                          {verificationResult.message}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-3.5 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-bold hover:bg-rose-800 cursor-pointer"
                      >
                        Pindai Ulang
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
