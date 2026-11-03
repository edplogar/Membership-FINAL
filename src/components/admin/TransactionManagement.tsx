import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Transaction, Member, Voucher } from '../../types';
import { formatIDR, formatDateIndo, calculatePointsEarned } from '../../services/membershipEngine';
import { Modal } from '../common/Modal';
import { MemberSearchSelect } from '../common/MemberSearchSelect';
import { UniversalBarcodeScanner } from '../common/UniversalBarcodeScanner';
import {
  Receipt,
  Plus,
  Search,
  Download,
  Sparkles,
  Coins,
  ScanLine,
  QrCode,
  CheckCircle2,
  Tag,
  AlertCircle,
  Building2,
  UtensilsCrossed,
  Flower2,
  X,
} from 'lucide-react';
import { exportToCSV } from '../../services/exportService';

interface TransactionManagementProps {
  preselectedMember?: Member | null;
  isOpenNewTxModal?: boolean;
  onCloseNewTxModal?: () => void;
}

export const TransactionManagement: React.FC<TransactionManagementProps> = ({
  preselectedMember,
  isOpenNewTxModal = false,
  onCloseNewTxModal,
}) => {
  const { transactions, members, tiers, pointRules, promotions, vouchers, recordTransaction, verifyVoucherByBarcode, redeemVoucherByBarcode } = useApp();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [isMemberScannerOpen, setIsMemberScannerOpen] = useState(false);
  const [isVoucherScannerOpen, setIsVoucherScannerOpen] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    title: string;
    discountType: 'percent' | 'fixed' | 'complimentary';
    discountValue: number;
    discountAmount: number;
  } | null>(null);

  const isModalOpen = isOpenNewTxModal || internalModalOpen;
  const handleCloseModal = () => {
    setInternalModalOpen(false);
    setIsMemberScannerOpen(false);
    setIsVoucherScannerOpen(false);
    setAppliedVoucher(null);
    if (onCloseNewTxModal) onCloseNewTxModal();
  };

  const [formData, setFormData] = useState({
    memberId: preselectedMember?.id || (members[0]?.id || ''),
    transactionNumber: `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().slice(0, 10),
    category: 'restaurant' as Transaction['category'],
    amount: 750000,
    paymentMethod: 'Credit Card' as Transaction['paymentMethod'],
    staffName: currentUser?.name || 'Front Desk Staff',
    referenceNumber: 'BILL-8890',
    notes: '',
  });

  useEffect(() => {
    if (preselectedMember) {
      setFormData((prev) => ({ ...prev, memberId: preselectedMember.id }));
    }
  }, [preselectedMember]);

  // Handler when barcode scanner detects member code
  const handleScanMemberBarcode = (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    let searchKey = clean;
    try {
      if (clean.startsWith('{') && clean.endsWith('}')) {
        const parsed = JSON.parse(clean);
        searchKey = parsed.membershipNumber || parsed.id || parsed.email || clean;
      }
    } catch {}

    if (searchKey.includes('/')) {
      const parts = searchKey.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length >= 3) searchKey = lastPart;
    }

    const keyLower = searchKey.toLowerCase();
    const found = members.find(
      (m) =>
        m.membershipNumber.toLowerCase() === keyLower ||
        m.id.toLowerCase() === keyLower ||
        (m.referralCode && m.referralCode.toLowerCase() === keyLower) ||
        m.phone.replace(/[^0-9]/g, '') === keyLower.replace(/[^0-9]/g, '') ||
        m.email.toLowerCase() === keyLower ||
        m.fullName.toLowerCase().includes(keyLower)
    );

    if (found) {
      setFormData((prev) => ({ ...prev, memberId: found.id }));
      setIsMemberScannerOpen(false);
      showToast(`Member Terpilih via Barcode: ${found.fullName} (${found.membershipNumber})`, 'success');
      // If modal was not open, open it
      if (!isModalOpen) {
        setInternalModalOpen(true);
      }
    } else {
      // Check if it's a voucher instead
      const verifiedVoucher = verifyVoucherByBarcode(clean);
      if (verifiedVoucher.isValid && verifiedVoucher.voucher) {
        handleApplyVoucherCode(clean);
        setIsMemberScannerOpen(false);
      } else {
        showToast(`Barcode / QR "${clean}" tidak cocok dengan data member hotel.`, 'error');
      }
    }
  };

  // Handler when barcode scanner detects voucher code
  const handleApplyVoucherCode = (code: string) => {
    const verified = verifyVoucherByBarcode(code);
    if (!verified.isValid || !verified.voucher) {
      showToast(verified.message, 'error');
      return;
    }

    const v = verified.voucher;
    let discountAmt = 0;
    if (v.type === 'percent') {
      discountAmt = Math.min((formData.amount * v.discountValue) / 100, v.maxDiscount || Infinity);
    } else if (v.type === 'fixed') {
      discountAmt = Math.min(v.discountValue, formData.amount);
    } else {
      // complimentary
      discountAmt = formData.amount;
    }

    setAppliedVoucher({
      code: v.code,
      title: v.title,
      discountType: v.type,
      discountValue: v.discountValue,
      discountAmount: discountAmt,
    });

    setIsVoucherScannerOpen(false);
    showToast(`Voucher Diskon "${v.title}" berhasil diterapkan (-${formatIDR(discountAmt)})!`, 'success');
  };

  // Physical Barcode Scanner Gun global listener when posting modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    let keyBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow gun input anywhere unless typing in text inputs that are not scanner receiver
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target.id !== 'scanner-gun-tx'
      ) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (keyBuffer.trim().length >= 3) {
          handleScanMemberBarcode(keyBuffer.trim());
          keyBuffer = '';
        }
        return;
      }

      if (diff > 120) {
        keyBuffer = '';
      }

      if (e.key.length === 1) {
        keyBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, members, isModalOpen]);

  // Live points calculator preview for staff
  const selectedMember = members.find((m) => m.id === formData.memberId) || members[0];
  const selectedTier = tiers.find((t) => t.id === selectedMember?.tierId) || tiers[0];
  
  // Calculate final amount after voucher deduction
  const finalPayableAmount = Math.max(0, formData.amount - (appliedVoucher?.discountAmount || 0));

  const pointCalcPreview = calculatePointsEarned(
    finalPayableAmount,
    selectedTier,
    pointRules,
    promotions
  );

  const filteredTxs = transactions.filter((tx) => {
    const member = members.find((m) => m.id === tx.memberId);
    const matchSearch =
      tx.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member?.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' || tx.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const txData = {
      ...formData,
      amount: finalPayableAmount,
      notes: appliedVoucher
        ? `${formData.notes ? formData.notes + ' | ' : ''}Diskon Voucher ${appliedVoucher.code} (-${formatIDR(appliedVoucher.discountAmount)})`
        : formData.notes,
    };

    recordTransaction(txData);

    // Also redeem the voucher via barcode engine so it syncs to used status & redemptions history
    if (appliedVoucher) {
      redeemVoucherByBarcode(appliedVoucher.code, {
        name: currentUser?.name || 'Staff Kasir',
        role: currentUser?.role || 'Staff Kasir/FO',
        outlet:
          formData.category === 'restaurant' || formData.category === 'bar'
            ? 'Restaurant & Bar'
            : formData.category === 'spa'
            ? 'Spa & Wellness'
            : 'Front Desk',
        transactionNumber: formData.transactionNumber,
        notes: `Digunakan pada posting transaksi bill #${formData.referenceNumber || formData.transactionNumber}`,
      });
    }

    handleCloseModal();
  };

  const handleExportCSV = () => {
    const headers = [
      'No. Transaksi',
      'Member',
      'Tanggal',
      'Kategori',
      'Metode Bayar',
      'Jumlah (IDR)',
      'Poin Diperoleh',
      'Referensi',
      'Staf',
    ];
    const rows = filteredTxs.map((t) => {
      const m = members.find((mem) => mem.id === t.memberId);
      return [
        t.transactionNumber,
        m?.fullName || '-',
        t.date,
        t.category,
        t.paymentMethod,
        t.amount,
        t.pointsEarned,
        t.referenceNumber,
        t.staffName,
      ];
    });
    exportToCSV('LGH_Data_Transaksi', headers, rows);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Pencatatan Transaksi & Perolehan Poin
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Mencatat transaksi belanja member di seluruh outlet kamar, restoran, bar, dan spa dengan dukungan Scan Barcode.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMemberScannerOpen(true)}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Pindai kartu member untuk langsung membuka posting transaksi"
          >
            <ScanLine className="w-4 h-4 text-emerald-300" />
            <span>Pindai Barcode Member</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => setInternalModalOpen(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Catat Transaksi Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi, member, referensi tagihan..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-stone-400 text-xs font-semibold whitespace-nowrap">
            Kategori:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
          >
            <option value="all">Semua Kategori</option>
            <option value="room">Room / Kamar</option>
            <option value="restaurant">Restoran Teratai</option>
            <option value="spa">Garden Sanctuary Spa</option>
            <option value="bar">Sasak Poolside Bar</option>
            <option value="laundry">Laundry</option>
            <option value="meeting">Meeting / Banquet</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">No. Tagihan</th>
                <th className="px-5 py-3.5">Nama Member</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5">Metode Bayar</th>
                <th className="px-5 py-3.5 text-right">Jumlah (IDR)</th>
                <th className="px-5 py-3.5 text-right">Poin Didapat</th>
                <th className="px-5 py-3.5">Staf Input</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTxs.map((tx) => {
                const member = members.find((m) => m.id === tx.memberId);
                return (
                  <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-800">
                      {tx.transactionNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900">
                        {member?.fullName || 'Tamu'}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {member?.membershipNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">{formatDateIndo(tx.date)}</td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize font-semibold text-stone-800">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">{tx.paymentMethod}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                      {formatIDR(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      +{tx.pointsEarned} pts
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 font-mono text-[11px]">
                      {tx.staffName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Pencatatan Transaksi Belanja Member"
        subtitle="Mencatat transaksi untuk otomatis menambah poin dan mengevaluasi upgrade tier"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Barcode Scanner Banner for Cashier / Staff */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <ScanLine className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Pindai Barcode / QR Member untuk otomatis mengisi profil tamu (atau gunakan Barcode Scanner Gun)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMemberScannerOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Pindai Barcode</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <MemberSearchSelect
                members={members}
                tiers={tiers}
                selectedMemberId={formData.memberId}
                onSelectMember={(selected) =>
                  setFormData({ ...formData, memberId: selected.id })
                }
                label="Pilih & Cari Member Tamu"
                placeholder="Cari nama member, no. kartu (LGH-...), atau no. HP/WA terdaftar..."
                required
              />
            </div>

            {/* Scanned Guest Snapshot Card */}
            {selectedMember && (
              <div className="sm:col-span-2 p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 font-serif font-bold text-sm flex items-center justify-center shrink-0">
                    {selectedMember.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <span>{selectedMember.fullName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {selectedTier.name} (Lvl {selectedTier.level})
                      </span>
                    </div>
                    <div className="text-stone-500 font-mono text-[11px] mt-0.5 flex items-center gap-2">
                      <span>{selectedMember.membershipNumber}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-semibold">
                        Poin Tersedia: {selectedMember.availablePoints.toLocaleString('id-ID')} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:pl-3 border-stone-200">
                  <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">
                    Diskon Tier Otomatis:
                  </span>
                  <span className="font-bold text-emerald-800">
                    {formData.category === 'restaurant' || formData.category === 'bar'
                      ? `F&B ${selectedTier.fnbDiscountPercent}%`
                      : formData.category === 'spa'
                      ? `Spa ${selectedTier.spaDiscountPercent}%`
                      : `Kamar ${selectedTier.roomDiscountPercent}%`}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kategori Belanja *
              </label>
              <select
                value={formData.category}
                onChange={(e: any) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="room">Akomodasi Kamar</option>
                <option value="restaurant">Restoran Teratai Garden</option>
                <option value="spa">Garden Sanctuary Spa</option>
                <option value="bar">Sasak Poolside Bar</option>
                <option value="laundry">Layanan Laundry</option>
                <option value="meeting">Meeting & Event</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e: any) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="QRIS">QRIS</option>
                <option value="Cash">Cash</option>
                <option value="Room Charge">Room Charge (Kamar)</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Total Jumlah Transaksi (IDR) *
              </label>
              <input
                type="number"
                min="10000"
                step="5000"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nomor Referensi Struk / Bill
              </label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) =>
                  setFormData({ ...formData, referenceNumber: e.target.value })
                }
                placeholder="POS-TERATAI-1092"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>

            {/* Voucher Barcode Apply Section */}
            <div className="sm:col-span-2 pt-1 border-t border-stone-200">
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  Kupon / Voucher Diskon Barcode (Opsional):
                </span>
                {!appliedVoucher && (
                  <button
                    type="button"
                    onClick={() => setIsVoucherScannerOpen(true)}
                    className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ScanLine className="w-3 h-3" />
                    <span>Pindai Barcode Voucher</span>
                  </button>
                )}
              </label>

              {appliedVoucher ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{appliedVoucher.title}</span>
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-amber-300">
                        {appliedVoucher.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5">
                      Potongan Harga: -{formatIDR(appliedVoucher.discountAmount)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedVoucher(null)}
                    className="p-1 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Hapus voucher"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="scanner-gun-tx"
                    placeholder="Masukkan atau scan barcode voucher (misal: PROMO-102)..."
                    className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) handleApplyVoucherCode(val);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsVoucherScannerOpen(true)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Points Engine Preview Box with Voucher Calculations */}
          <div className="p-4 bg-stone-900 text-stone-100 rounded-xl border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 font-mono">
                Tier Member: <strong className="text-amber-300">{selectedTier.name}</strong> ({selectedTier.pointMultiplier}x Multiplier)
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                Estimasi Poin: +{pointCalcPreview.totalPoints} pts
              </span>
            </div>

            {appliedVoucher && (
              <div className="text-[11px] text-amber-300/90 font-mono flex items-center justify-between border-t border-stone-800 pt-1.5">
                <span>Subtotal: {formatIDR(formData.amount)} | Diskon: -{formatIDR(appliedVoucher.discountAmount)}</span>
                <span className="font-bold text-white">Net Bayar: {formatIDR(finalPayableAmount)}</span>
              </div>
            )}

            <div className="text-[11px] text-stone-400">
              Perhitungan: (Rp {finalPayableAmount.toLocaleString('id-ID')} / Rp{' '}
              {pointRules.rupiahPerPoint.toLocaleString('id-ID')}) ×{' '}
              {selectedTier.pointMultiplier}
              {pointCalcPreview.campaignMultiplier > 1 &&
                ` × ${pointCalcPreview.campaignMultiplier} (Campaign Bonus)`}{' '}
              ={' '}
              <strong className="text-white">
                {pointCalcPreview.totalPoints} Poin Loyalitas
              </strong>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              Simpan & Terbitkan Poin
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Member Barcode Scanner */}
      {isMemberScannerOpen && (
        <Modal
          isOpen={isMemberScannerOpen}
          onClose={() => setIsMemberScannerOpen(false)}
          title="Pindai Barcode / QR Member"
          subtitle="Arahkan kamera ke kartu member fisik atau digital tamu hotel"
          maxWidth="md"
        >
          <div className="space-y-4 py-2">
            <UniversalBarcodeScanner
              onScan={handleScanMemberBarcode}
              title="Scanner Kartu Member"
              placeholder="Arahkan kamera ke Barcode (Code128/39) atau QR Kartu Tamu"
            />
          </div>
        </Modal>
      )}

      {/* Modal for Voucher Barcode Scanner */}
      {isVoucherScannerOpen && (
        <Modal
          isOpen={isVoucherScannerOpen}
          onClose={() => setIsVoucherScannerOpen(false)}
          title="Pindai Barcode Voucher Diskon"
          subtitle="Pindai barcode atau QR kupon diskon member untuk memotong bill tagihan"
          maxWidth="md"
        >
          <div className="space-y-4 py-2">
            <UniversalBarcodeScanner
              onScan={handleApplyVoucherCode}
              title="Scanner Barcode Voucher"
              placeholder="Arahkan kamera ke Barcode atau QR Voucher Tamu"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
