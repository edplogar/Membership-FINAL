import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Member, MembershipTier } from '../../types';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import { exportToCSV } from '../../services/exportService';
import { sendFirebasePasswordResetEmail } from '../../services/firebase';
import { downloadMemberCardImage } from '../../services/cardDownloadService';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MemberCardSuccessModal } from '../common/MemberCardSuccessModal';
import {
  Search,
  Filter,
  Download,
  UserPlus,
  Eye,
  Edit2,
  Coins,
  Shield,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  KeyRound,
  ArrowUpDown,
  Cake,
  Gift,
} from 'lucide-react';
import { calculateMemberBirthdayInfo } from '../../services/birthdayService';

interface MemberListProps {
  onSelectMember: (member: Member) => void;
  onOpenCheckIn: (member: Member) => void;
  onOpenAddTransaction: (member: Member) => void;
  onOpenAdjustPoints: (member: Member) => void;
  onOpenChangeTier: (member: Member) => void;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  onSelectMember,
  onOpenCheckIn,
  onOpenAddTransaction,
  onOpenAdjustPoints,
  onOpenChangeTier,
  isAddModalOpen: externalAddOpen = false,
  onCloseAddModal: externalAddClose,
}) => {
  const { members, tiers, addMember, updateMember, deleteMember } = useApp();
  const { hasPermission, userRole, resetPasswordWithRecovery } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [birthdayFilter, setBirthdayFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'spending' | 'points' | 'visits' | 'date'>('spending');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const isAddModalOpen = externalAddOpen || internalAddOpen;
  const handleCloseAddModal = () => {
    setInternalAddOpen(false);
    if (externalAddClose) externalAddClose();
  };

  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [memberToResetPassword, setMemberToResetPassword] = useState<Member | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [isResetActionLoading, setIsResetActionLoading] = useState(false);
  const [newlyCreatedMember, setNewlyCreatedMember] = useState<Member | null>(null);
  const [downloadingMemberId, setDownloadingMemberId] = useState<string | null>(null);

  // Download member card image
  const handleDownloadMemberCard = async (m: Member) => {
    const tier = tiers.find((t) => t.id === m.tierId) || tiers[0];
    setDownloadingMemberId(m.id);
    try {
      const ok = await downloadMemberCardImage(m, tier);
      if (ok) {
        showToast(`Kartu member ${m.fullName} (${m.membershipNumber}) berhasil diunduh (PNG)!`, 'success');
      } else {
        showToast('Gagal mengunduh kartu member.', 'error');
      }
    } catch {
      showToast('Gagal memproses kartu.', 'error');
    } finally {
      setDownloadingMemberId(null);
    }
  };

  // Form State for Add Member
  const [newMemberForm, setNewMemberForm] = useState({
    fullName: '',
    nickname: '',
    email: '',
    phone: '',
    gender: 'L' as 'L' | 'P',
    birthDate: '1990-01-01',
    address: 'Jl. Pariwisata Senggigi',
    city: 'Lombok Barat',
    province: 'Nusa Tenggara Barat',
    country: 'Indonesia',
    idCardNumber: '',
    tierId: 'tier_member',
    internalNotes: '',
  });

  // Filter & Sort
  const filteredMembers = members
    .filter((m) => {
      const matchSearch =
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.membershipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery);

      const matchTier = selectedTier === 'all' || m.tierId === selectedTier;
      const matchStatus = selectedStatus === 'all' || m.status === selectedStatus;

      let matchBirthday = true;
      if (birthdayFilter !== 'all') {
        const bday = calculateMemberBirthdayInfo(m);
        if (!bday) {
          matchBirthday = false;
        } else if (birthdayFilter === 'today') {
          matchBirthday = bday.isToday;
        } else if (birthdayFilter === 'week') {
          matchBirthday = bday.daysUntil <= 7;
        } else if (birthdayFilter === 'month') {
          matchBirthday = bday.daysUntil <= 30;
        }
      }

      return matchSearch && matchTier && matchStatus && matchBirthday;
    })
    .sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'spending') {
        valA = a.totalSpending;
        valB = b.totalSpending;
      } else if (sortBy === 'points') {
        valA = a.availablePoints;
        valB = b.availablePoints;
      } else if (sortBy === 'visits') {
        valA = a.totalVisits;
        valB = b.totalVisits;
      } else {
        valA = new Date(a.registrationDate).getTime();
        valB = new Date(b.registrationDate).getTime();
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Member ID',
      'No. Membership',
      'Nama Lengkap',
      'Email',
      'No. HP',
      'Tier',
      'Status',
      'Tgl Bergabung',
      'Berlaku Hingga',
      'Total Kunjungan',
      'Total Spending (IDR)',
      'Poin Tersedia',
    ];

    const rows = filteredMembers.map((m) => {
      const tier = tiers.find((t) => t.id === m.tierId)?.name || 'Member';
      return [
        m.id,
        m.membershipNumber,
        m.fullName,
        m.email,
        m.phone,
        tier,
        m.status,
        m.registrationDate,
        m.membershipEndDate,
        m.totalVisits,
        m.totalSpending,
        m.availablePoints,
      ];
    });

    exportToCSV('LGH_Data_Member', headers, rows);
    showToast('Data member berhasil diekspor ke CSV!', 'success');
  };

  // Submit Add Member
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.fullName || !newMemberForm.email || !newMemberForm.phone) {
      showToast('Harap lengkapi semua field bertanda bintang.', 'error');
      return;
    }

    // Check duplicate email
    if (members.some((m) => m.email.toLowerCase() === newMemberForm.email.toLowerCase())) {
      showToast('Email tersebut sudah terdaftar pada member lain.', 'error');
      return;
    }

    const now = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 24 * 30 * 86400000).toISOString().slice(0, 10);

    const created = addMember({
      ...newMemberForm,
      registrationDate: now,
      membershipStartDate: now,
      membershipEndDate: end,
      referralCode: `${newMemberForm.fullName.split(' ')[0].toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      status: 'ACTIVE',
    });

    handleCloseAddModal();
    setNewlyCreatedMember(created);
  };

  // Toggle member status
  const handleToggleStatus = (member: Member) => {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateMember(member.id, { status: newStatus });
    showToast(
      `Status member ${member.fullName} diubah menjadi ${newStatus}.`,
      'info'
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Daftar Anggota / Member Hotel
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola data member, riwayat transaksi, penyesuaian poin, dan level keanggotaan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasPermission('reports.export') && (
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
          )}

          {hasPermission('member.create') && (
            <button
              onClick={() => setInternalAddOpen(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama tamu, nomor member (LGH-...), email, atau HP..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
        </div>

        {/* Tier Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-stone-400 text-xs font-semibold whitespace-nowrap">Tier:</span>
          <select
            value={selectedTier}
            onChange={(e) => {
              setSelectedTier(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-700/20"
          >
            <option value="all">Semua Tier</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Lvl {t.level})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-stone-400 text-xs font-semibold whitespace-nowrap">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-700/20"
          >
            <option value="all">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="EXPIRED">Kedaluwarsa</option>
          </select>
        </div>

        {/* Birthday Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <Cake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <select
            value={birthdayFilter}
            onChange={(e: any) => {
              setBirthdayFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-700/20"
          >
            <option value="all">Semua Ultah</option>
            <option value="today">🎂 Hari Ini</option>
            <option value="week">🎂 7 Hari Mendatang</option>
            <option value="month">🎂 30 Hari Mendatang</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-600 transition-colors"
            title="Ubah Urutan"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-700/20"
          >
            <option value="spending">Total Belanja</option>
            <option value="points">Saldo Poin</option>
            <option value="visits">Kunjungan</option>
            <option value="date">Tanggal Gabung</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400">
            Tidak ada member yang cocok dengan filter pencarian
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">No. Member</th>
                  <th className="px-5 py-3.5">Nama & Kontak</th>
                  <th className="px-5 py-3.5">Tier</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5">Kunjungan</th>
                  <th className="px-5 py-3.5 text-right">Total Spending</th>
                  <th className="px-5 py-3.5 text-right">Poin</th>
                  <th className="px-5 py-3.5 text-center">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedMembers.map((m) => {
                  const tier = tiers.find((t) => t.id === m.tierId) || tiers[0];
                  const bday = calculateMemberBirthdayInfo(m);
                  return (
                    <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-stone-800 whitespace-nowrap">
                        {m.membershipNumber}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-stone-900">{m.fullName}</span>
                          {bday && bday.isUpcoming && (
                            bday.isToday ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950 shadow-2xs animate-pulse"
                                title={`Ultah Hari Ini! Genap ${bday.turningAge} tahun`}
                              >
                                <Cake className="w-2.5 h-2.5" />
                                Ultah Hari Ini! ({bday.turningAge} th)
                              </span>
                            ) : bday.daysUntil <= 7 ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300"
                                title={`Ultah dalam ${bday.daysUntil} hari (${bday.formattedBirthday})`}
                              >
                                <Cake className="w-2.5 h-2.5 text-amber-600" />
                                {bday.daysUntil} hr lagi
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200"
                                title={`Ultah dalam ${bday.daysUntil} hari (${bday.formattedBirthday})`}
                              >
                                <Cake className="w-2.5 h-2.5 text-stone-500" />
                                {bday.daysUntil} hr
                              </span>
                            )
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                          <span>{m.phone} · {m.city}</span>
                          {m.birthDate && (
                            <span className="text-[10px] text-stone-400">
                              (Lahir: {formatDateIndo(m.birthDate)})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px]"
                          style={{
                            backgroundColor: `${tier.colorHex}15`,
                            color: tier.colorHex,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: tier.colorHex }}
                          />
                          {tier.name}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-stone-700">
                        {m.totalVisits}x Stay
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {formatIDR(m.totalSpending)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        {m.availablePoints.toLocaleString('id-ID')} pts
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          {/* View details */}
                          <button
                            onClick={() => onSelectMember(m)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Lihat Profil Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Member Card PNG */}
                          <button
                            type="button"
                            onClick={() => handleDownloadMemberCard(m)}
                            disabled={downloadingMemberId === m.id}
                            className="p-1.5 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Unduh Kartu Membership Digital (PNG)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Adjust points */}
                          {hasPermission('points.adjust') && (
                            <button
                              onClick={() => onOpenAdjustPoints(m)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Sesuaikan Poin"
                            >
                              <Coins className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick Change tier */}
                          {hasPermission('member.tier_change') && (
                            <button
                              onClick={() => onOpenChangeTier(m)}
                              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Ubah Tier Keanggotaan"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Active status */}
                          {hasPermission('member.edit') && (
                            <button
                              onClick={() => handleToggleStatus(m)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                m.status === 'ACTIVE'
                                  ? 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={m.status === 'ACTIVE' ? 'Nonaktifkan Member' : 'Aktifkan Kembali'}
                            >
                              {m.status === 'ACTIVE' ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Reset password - STRICTLY FOR SUPER ADMIN OR SECURITY ADMIN */}
                          {(userRole === 'SUPER_ADMIN' || hasPermission('security.manage')) && (
                            <button
                              onClick={() => {
                                setMemberToResetPassword(m);
                                setAdminNewPassword('');
                                setAdminConfirmPassword('');
                              }}
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Atur Ulang Kata Sandi Member"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Member */}
                          {(userRole === 'SUPER_ADMIN' || hasPermission('member.delete')) && (
                            <button
                              onClick={() => setMemberToDelete(m)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Member Permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredMembers.length > 0 && (
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <div>
              Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredMembers.length)} dari{' '}
              {filteredMembers.length} member
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 bg-white border border-stone-200 rounded-lg font-medium hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="font-mono px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-stone-200 rounded-lg font-medium hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add Member */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Pendaftaran Member Baru Lombok Garden Hotel"
        subtitle="Registrasikan tamu hotel ke program keanggotaan dan terbitkan kartu digital"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={newMemberForm.fullName}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, fullName: e.target.value })
                }
                placeholder="Contoh: Raden Surya"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Panggilan
              </label>
              <input
                type="text"
                value={newMemberForm.nickname}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, nickname: e.target.value })
                }
                placeholder="Contoh: Surya"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Aktif *
              </label>
              <input
                type="email"
                value={newMemberForm.email}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, email: e.target.value })
                }
                placeholder="surya@example.com"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nomor Handphone / WhatsApp *
              </label>
              <input
                type="tel"
                value={newMemberForm.phone}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, phone: e.target.value })
                }
                placeholder="+62 812-xxxx-xxxx"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={newMemberForm.gender}
                onChange={(e: any) =>
                  setNewMemberForm({ ...newMemberForm, gender: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tanggal Lahir (Bonus Ultah)
              </label>
              <input
                type="date"
                value={newMemberForm.birthDate}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, birthDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nomor KTP / Paspor
              </label>
              <input
                type="text"
                value={newMemberForm.idCardNumber}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, idCardNumber: e.target.value })
                }
                placeholder="5201xxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tier Awal Keanggotaan
              </label>
              <select
                value={newMemberForm.tierId}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, tierId: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Lvl {t.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Alamat Tinggal / Domisili
              </label>
              <input
                type="text"
                value={newMemberForm.address}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, address: e.target.value })
                }
                placeholder="Alamat lengkap..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Catatan Internal Front Desk (Preferensi Tamu)
              </label>
              <textarea
                rows={2}
                value={newMemberForm.internalNotes}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, internalNotes: e.target.value })
                }
                placeholder="Catatan preferensi kamar, alergi, atau permintaan istimewa..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={handleCloseAddModal}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs"
            >
              Daftarkan Member Sekarang
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Dedicated Member Password Reset Modal */}
      <Modal
        isOpen={Boolean(memberToResetPassword)}
        onClose={() => {
          setMemberToResetPassword(null);
          setAdminNewPassword('');
          setAdminConfirmPassword('');
        }}
        title="Atur Ulang Kata Sandi Akun Member"
        subtitle={`Manajemen Keamanan Kredensial: ${memberToResetPassword?.fullName} (${memberToResetPassword?.membershipNumber})`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Hak Akses Super Admin:</strong> Anda dapat menetapkan kata sandi baru secara langsung untuk member ini atau mengirimkan email reset resmi ke alamat email terdaftar.
            </div>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Nama Lengkap:</span>
              <span className="font-bold text-stone-900">{memberToResetPassword?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Email Akun (Login):</span>
              <span className="font-bold text-emerald-800">{memberToResetPassword?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Nomor Member:</span>
              <span className="font-bold text-stone-900">{memberToResetPassword?.membershipNumber}</span>
            </div>
          </div>

          {/* Direct Password Reset Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!memberToResetPassword) return;
              if (!adminNewPassword || adminNewPassword.length < 6) {
                showToast('Kata sandi baru minimal harus 6 karakter.', 'error');
                return;
              }
              if (adminNewPassword !== adminConfirmPassword) {
                showToast('Konfirmasi kata sandi tidak cocok.', 'error');
                return;
              }

              setIsResetActionLoading(true);
              const success = resetPasswordWithRecovery(memberToResetPassword.email, adminNewPassword);
              setIsResetActionLoading(false);

              if (success) {
                showToast(`Kata sandi untuk member ${memberToResetPassword.fullName} berhasil diubah!`, 'success');
                setMemberToResetPassword(null);
                setAdminNewPassword('');
                setAdminConfirmPassword('');
              } else {
                showToast('Gagal mengubah kata sandi member.', 'error');
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
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
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
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang sandi baru"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isResetActionLoading || !adminNewPassword}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isResetActionLoading ? 'Memperbarui...' : 'Simpan & Terapkan Kata Sandi Baru'}</span>
            </button>
          </form>

          {/* Alternative: Dispatch Reset Email */}
          <div className="pt-3 border-t border-stone-200 space-y-2">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. Atau Kirim Tautan Reset ke Email Tamu</span>
            </h4>
            <p className="text-stone-500 text-[11px]">
              Tamu akan menerima email berisi tautan resmi untuk membuat kata sandi mandiri.
            </p>
            <button
              type="button"
              onClick={async () => {
                if (memberToResetPassword) {
                  setIsResetActionLoading(true);
                  await sendFirebasePasswordResetEmail(memberToResetPassword.email, {
                    name: memberToResetPassword.fullName,
                    phone: memberToResetPassword.phone,
                    membershipNumber: memberToResetPassword.membershipNumber,
                  });
                  setIsResetActionLoading(false);
                  showToast(
                    `Instruksi dan tautan reset kata sandi telah dikirim ke ${memberToResetPassword.email}.`,
                    'success'
                  );
                  setMemberToResetPassword(null);
                }
              }}
              disabled={isResetActionLoading}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Kirim Tautan Reset ke Email Member</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Member Dialog - Strictly SUPER ADMIN */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => {
          if (memberToDelete) {
            deleteMember(memberToDelete.id);
            setMemberToDelete(null);
          }
        }}
        title="Hapus Data Member Secara Permanen?"
        message={`Apakah Anda yakin ingin menghapus data member "${memberToDelete?.fullName}" (${memberToDelete?.membershipNumber}) secara permanen? Seluruh riwayat poin dan akun login tamu ini akan dihapus dari sistem. Tindakan ini hanya dapat dilakukan oleh Super Admin.`}
        confirmText="Hapus Permanen"
        isDestructive={true}
      />

      {/* Member Card Visualization Upon Registration / Creation Modal */}
      {newlyCreatedMember && (
        <MemberCardSuccessModal
          isOpen={Boolean(newlyCreatedMember)}
          onClose={() => setNewlyCreatedMember(null)}
          member={newlyCreatedMember}
          tier={tiers.find((t) => t.id === newlyCreatedMember.tierId) || tiers[0]}
          onContinue={() => {
            const mem = newlyCreatedMember;
            setNewlyCreatedMember(null);
            if (mem) onSelectMember(mem);
          }}
          continueButtonText="Buka Profil Lengkap Member"
          title="Member Baru Berhasil Didaftarkan! Kartu Digital Telah Diterbitkan 🎉"
        />
      )}
    </div>
  );
};
