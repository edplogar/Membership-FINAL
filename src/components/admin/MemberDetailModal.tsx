import React, { useState } from 'react';
import { Member, MembershipTier } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import { sendFirebasePasswordResetEmail } from '../../services/firebase';
import { downloadMemberCardImage } from '../../services/cardDownloadService';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { QRCodeView } from '../common/QRCodeView';
import {
  User,
  Shield,
  Coins,
  BedDouble,
  Receipt,
  Ticket,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  Trash2,
  KeyRound,
  Download,
} from 'lucide-react';

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onActionCheckIn?: (m: Member) => void;
  onActionAddTransaction?: (m: Member) => void;
  onActionAdjustPoints?: (m: Member) => void;
  onActionChangeTier?: (m: Member) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
  onActionCheckIn,
  onActionAddTransaction,
  onActionAdjustPoints,
  onActionChangeTier,
}) => {
  const { tiers, stays, transactions, pointTransactions, redemptions, deleteMember } = useApp();
  const { userRole, resetPasswordWithRecovery, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'stays' | 'spending' | 'loyalty' | 'timeline'>('profile');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!member) return null;

  const currentTier: MembershipTier =
    tiers.find((t) => t.id === member.tierId) || tiers[0];

  const handleDownloadCard = async () => {
    setIsDownloading(true);
    try {
      const ok = await downloadMemberCardImage(member, currentTier);
      if (ok) {
        showToast(`Kartu member ${member.fullName} (${member.membershipNumber}) berhasil diunduh (PNG)!`, 'success');
      } else {
        showToast('Gagal mengunduh kartu member.', 'error');
      }
    } catch {
      showToast('Gagal memproses kartu.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const memberStays = stays.filter((s) => s.memberId === member.id);
  const memberTransactions = transactions.filter((t) => t.memberId === member.id);
  const memberPointLogs = pointTransactions.filter((pt) => pt.memberId === member.id);
  const memberRedemptions = redemptions.filter((r) => r.memberId === member.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Profil Tamu: ${member.fullName}`}
      subtitle={`Nomor Membership: ${member.membershipNumber}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Guest Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-stone-900 text-white border border-stone-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-amber-300 font-serif-luxury text-2xl font-bold flex items-center justify-center shrink-0">
              {member.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{member.fullName}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-mono">
                  {member.status}
                </span>
              </div>
              <div className="text-xs text-stone-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  {member.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-stone-500" />
                  {member.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-stone-400 uppercase font-semibold">
                Tier Keanggotaan
              </div>
              <div className="font-serif-luxury text-base font-bold text-amber-400">
                {currentTier.name}
              </div>
              <div className="text-[11px] font-mono text-stone-400">
                {member.availablePoints} Poin Tersedia
              </div>
            </div>

            {onActionAdjustPoints && (
              <button
                onClick={() => onActionAdjustPoints(member)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Sesuaikan Poin</span>
              </button>
            )}

            {onActionChangeTier && (
              <button
                onClick={() => onActionChangeTier(member)}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
              >
                Ubah Tier
              </button>
            )}

            {/* Download Member Card PNG Action */}
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Unduh Kartu Membership Digital (Format PNG)"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>{isDownloading ? 'Mengunduh...' : 'Unduh Kartu'}</span>
            </button>

            {/* Reset Password Action */}
            {(userRole === 'SUPER_ADMIN' || hasPermission('security.manage')) && (
              <button
                type="button"
                onClick={() => {
                  setNewPassword('');
                  setConfirmPassword('');
                  setIsResetPasswordOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-semibold border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Atur Ulang Kata Sandi Akun Member"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Sandi</span>
              </button>
            )}

            {/* Permanent Delete Action */}
            {(userRole === 'SUPER_ADMIN' || hasPermission('member.delete')) && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-semibold border border-rose-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Hapus data member permanen"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto text-xs font-semibold pb-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Informasi Profil
          </button>
          <button
            onClick={() => setActiveTab('stays')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'stays'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Riwayat Stay ({memberStays.length})
          </button>
          <button
            onClick={() => setActiveTab('spending')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'spending'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Transaksi Belanja ({memberTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'loyalty'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Loyalitas & Voucher
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Activity Timeline
          </button>
        </div>

        {/* TAB 1: Profile & Demographics */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-3 text-xs">
              <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wider mb-2">
                Data Pribadi & Identitas
              </h4>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Nama Lengkap</span>
                <span className="font-semibold text-stone-900">{member.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Panggilan</span>
                <span className="font-semibold text-stone-900">{member.nickname || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Nomor KTP/Paspor</span>
                <span className="font-mono text-stone-900">{member.idCardNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Tanggal Lahir</span>
                <span className="font-mono text-stone-900">{formatDateIndo(member.birthDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Jenis Kelamin</span>
                <span className="font-semibold text-stone-900">
                  {member.gender === 'L' ? 'Laki-laki' : member.gender === 'P' ? 'Perempuan' : 'Lainnya'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500">Alamat & Kota</span>
                <span className="font-semibold text-stone-900 text-right max-w-[200px]">
                  {member.address}, {member.city}, {member.country}
                </span>
              </div>
            </div>

            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-3 text-xs">
              <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wider mb-2">
                Status Keanggotaan & Catatan Internal
              </h4>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Tanggal Registrasi</span>
                <span className="font-mono text-stone-900">{formatDateIndo(member.registrationDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Masa Berlaku Kartu</span>
                <span className="font-mono text-stone-900">{formatDateIndo(member.membershipEndDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-200/60">
                <span className="text-stone-500">Kode Referral</span>
                <span className="font-mono font-bold text-amber-700">{member.referralCode}</span>
              </div>
              <div className="py-2">
                <span className="text-stone-500 block mb-1">Catatan Internal Staf:</span>
                <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-700 italic">
                  {member.internalNotes || 'Tidak ada catatan preferensi khusus.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Stays History */}
        {activeTab === 'stays' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm">
                Riwayat Menginap ({memberStays.length} Kunjungan)
              </h4>
              {onActionCheckIn && (
                <button
                  onClick={() => onActionCheckIn(member)}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold"
                >
                  + Catat Stay Baru
                </button>
              )}
            </div>

            {memberStays.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-400 text-xs">
                Belum ada data menginap untuk tamu ini
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Booking ID</th>
                      <th className="px-4 py-3">Kamar & Tipe</th>
                      <th className="px-4 py-3">Tanggal Check-In</th>
                      <th className="px-4 py-3">Durasi</th>
                      <th className="px-4 py-3 text-right">Biaya</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {memberStays.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono font-medium">{s.bookingNumber}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-stone-900">Rm {s.roomNumber}</span> - {s.roomType}
                        </td>
                        <td className="px-4 py-3 font-mono">{formatDateIndo(s.checkInDate)}</td>
                        <td className="px-4 py-3">{s.nights} Malam</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-stone-900">
                          {formatIDR(s.totalAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-stone-100 text-stone-700">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Spending History */}
        {activeTab === 'spending' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm">
                Riwayat Transaksi Belanja ({formatIDR(member.totalSpending)})
              </h4>
              {onActionAddTransaction && (
                <button
                  onClick={() => onActionAddTransaction(member)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-semibold"
                >
                  + Tambah Transaksi
                </button>
              )}
            </div>

            {memberTransactions.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-400 text-xs">
                Belum ada transaksi tercatat
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">No. Tagihan</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Metode Bayar</th>
                      <th className="px-4 py-3 text-right">Jumlah</th>
                      <th className="px-4 py-3 text-right">Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {memberTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono">{t.transactionNumber}</td>
                        <td className="px-4 py-3 font-mono">{formatDateIndo(t.date)}</td>
                        <td className="px-4 py-3 capitalize font-semibold">{t.category}</td>
                        <td className="px-4 py-3 text-stone-500">{t.paymentMethod}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-stone-900">
                          {formatIDR(t.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                          +{t.pointsEarned} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Loyalty & Redemptions */}
        {activeTab === 'loyalty' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm">
                Buku Besar Poin & Penukaran Hadiah
              </h4>
              {onActionAdjustPoints && (
                <button
                  onClick={() => onActionAdjustPoints(member)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                >
                  Sesuaikan Poin Manual
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-[10px] text-stone-500 uppercase font-semibold">Poin Tersedia</div>
                <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">
                  {member.availablePoints} pts
                </div>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-[10px] text-stone-500 uppercase font-semibold">Total Poin Didapat</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                  +{member.totalPointsEarned} pts
                </div>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-[10px] text-stone-500 uppercase font-semibold">Poin Ditukarkan</div>
                <div className="text-xl font-bold font-mono text-stone-800 mt-0.5">
                  -{member.redeemedPoints} pts
                </div>
              </div>
            </div>

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden text-xs">
              {memberPointLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50">
                  <div>
                    <div className="font-semibold text-stone-900">{log.description}</div>
                    <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                      {formatDateIndo(log.createdAt.slice(0, 10))} · Staf: {log.staffName}
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      log.amount > 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {log.amount > 0 ? `+${log.amount}` : log.amount} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Activity Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h4 className="font-bold text-stone-900 text-sm">
              Kronologi Aktivitas Akun
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              <div className="relative">
                <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
                <div className="text-xs font-bold text-stone-900">Member Resmi Terdaftar</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Akun bergabung pada {formatDateIndo(member.registrationDate)} dengan nomor{' '}
                  {member.membershipNumber}
                </div>
              </div>

              {memberStays.map((s) => (
                <div key={s.id} className="relative">
                  <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-white" />
                  <div className="text-xs font-bold text-stone-900">
                    Kunjungan Menginap Kamar {s.roomNumber} ({s.nights} Malam)
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Check-in pada {formatDateIndo(s.checkInDate)} dengan total tagihan{' '}
                    {formatIDR(s.totalAmount)}
                  </div>
                </div>
              ))}

              <div className="relative">
                <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-stone-800 ring-4 ring-white" />
                <div className="text-xs font-bold text-stone-900">Tier Aktif Saat Ini: {currentTier.name}</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Akumulasi spending {formatIDR(member.totalSpending)} dan {member.totalVisits}x kunjungan
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Super Admin Password Reset Modal */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          setNewPassword('');
          setConfirmPassword('');
        }}
        title="Atur Ulang Kata Sandi Akun Member"
        subtitle={`Kredensial Login: ${member.fullName} (${member.membershipNumber})`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Hak Akses Super Admin:</strong> Anda dapat menetapkan kata sandi baru untuk member ini atau mengirimkan email reset resmi ke <strong>{member.email}</strong>.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPassword || newPassword.length < 6) {
                showToast('Kata sandi baru minimal harus 6 karakter.', 'error');
                return;
              }
              if (newPassword !== confirmPassword) {
                showToast('Konfirmasi kata sandi tidak cocok.', 'error');
                return;
              }

              setIsLoading(true);
              const success = resetPasswordWithRecovery(member.email, newPassword);
              setIsLoading(false);

              if (success) {
                showToast(`Kata sandi untuk ${member.fullName} berhasil diperbarui!`, 'success');
                setIsResetPasswordOpen(false);
                setNewPassword('');
                setConfirmPassword('');
              } else {
                showToast('Gagal mengubah kata sandi.', 'error');
              }
            }}
            className="space-y-3 pt-2 border-t border-stone-200"
          >
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Tetapkan Kata Sandi Baru Secara Manual</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Kata Sandi Baru *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Konfirmasi Kata Sandi *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang sandi"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newPassword}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Memperbarui...' : 'Simpan & Terapkan Kata Sandi Baru'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-stone-200 space-y-2">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. Atau Kirim Tautan Reset ke Email Tamu</span>
            </h4>
            <button
              type="button"
              onClick={async () => {
                setIsLoading(true);
                await sendFirebasePasswordResetEmail(member.email, {
                  name: member.fullName,
                  phone: member.phone,
                  membershipNumber: member.membershipNumber,
                });
                setIsLoading(false);
                showToast(`Tautan reset kata sandi telah dikirim ke ${member.email}.`, 'success');
                setIsResetPasswordOpen(false);
              }}
              disabled={isLoading}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Kirim Tautan Reset ke {member.email}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Member Confirmation Dialog (SUPER ADMIN ONLY) */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          deleteMember(member.id);
          setIsConfirmDeleteOpen(false);
          onClose();
        }}
        title="Hapus Data Member Permanen?"
        message={`Apakah Anda yakin ingin menghapus data member "${member.fullName}" (${member.membershipNumber}) secara permanen? Seluruh riwayat transaksi, poin, dan akun login akan dihapus.`}
        confirmText="Hapus Permanen"
        isDestructive={true}
      />
    </Modal>
  );
};
