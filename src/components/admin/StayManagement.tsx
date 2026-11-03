import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Stay, Member } from '../../types';
import { formatIDR, formatDateIndo } from '../../services/membershipEngine';
import { Modal } from '../common/Modal';
import { MemberSearchSelect } from '../common/MemberSearchSelect';
import { BedDouble, Plus, Calendar, Check, Search, Download } from 'lucide-react';
import { exportToCSV } from '../../services/exportService';

interface StayManagementProps {
  preselectedMember?: Member | null;
  isOpenNewStayModal?: boolean;
  onCloseNewStayModal?: () => void;
}

export const StayManagement: React.FC<StayManagementProps> = ({
  preselectedMember,
  isOpenNewStayModal = false,
  onCloseNewStayModal,
}) => {
  const { stays, members, tiers, recordStay, updateStayStatus } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  const isModalOpen = isOpenNewStayModal || internalModalOpen;
  const handleCloseModal = () => {
    setInternalModalOpen(false);
    if (onCloseNewStayModal) onCloseNewStayModal();
  };

  const [formData, setFormData] = useState({
    memberId: preselectedMember?.id || (members[0]?.id || ''),
    bookingNumber: `LGH-BK-${Date.now().toString().slice(-6)}`,
    roomNumber: '308',
    roomType: 'Deluxe Garden View King',
    checkInDate: new Date().toISOString().slice(0, 10),
    checkOutDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    nights: 3,
    guestCount: 2,
    totalAmount: 5850000,
    paymentStatus: 'paid' as 'paid' | 'pending',
    bookingSource: 'Direct Website' as const,
    staffName: 'Front Office Reception',
    status: 'checked_in' as Stay['status'],
    notes: '',
  });

  React.useEffect(() => {
    if (preselectedMember) {
      setFormData((prev) => ({ ...prev, memberId: preselectedMember.id }));
    } else if (!formData.memberId && members.length > 0) {
      setFormData((prev) => ({ ...prev, memberId: members[0].id }));
    }
  }, [preselectedMember, members]);

  const filteredStays = stays.filter((s) => {
    const member = members.find((m) => m.id === s.memberId);
    const q = (searchQuery || '').toLowerCase().trim();
    const matchSearch =
      !q ||
      (s.bookingNumber || '').toLowerCase().includes(q) ||
      (s.roomNumber || '').includes(q) ||
      (member?.fullName || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memberId) {
      return;
    }
    recordStay(formData);
    handleCloseModal();
  };

  const handleExportCSV = () => {
    const headers = [
      'Booking Number',
      'Member',
      'No. Kamar',
      'Tipe Kamar',
      'Tgl Check-In',
      'Tgl Check-Out',
      'Durasi Malam',
      'Total Biaya',
      'Status',
    ];
    const rows = filteredStays.map((s) => {
      const m = members.find((mem) => mem.id === s.memberId);
      return [
        s.bookingNumber,
        m?.fullName || '-',
        s.roomNumber,
        s.roomType,
        s.checkInDate,
        s.checkOutDate,
        s.nights,
        s.totalAmount,
        s.status,
      ];
    });
    exportToCSV('LGH_Stay_Records', headers, rows);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Pencatatan Kunjungan Menginap (Stay)
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Data reservasi, check-in kamar, dan akumulasi malam menginap tamu hotel.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => setInternalModalOpen(true)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Stay Baru</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kamar, nomor reservasi, nama tamu..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-stone-400 text-xs font-semibold whitespace-nowrap">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
          >
            <option value="all">Semua Status</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="reserved">Reserved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Stays Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">No. Booking</th>
                <th className="px-5 py-3.5">Nama Member</th>
                <th className="px-5 py-3.5">Kamar & Tipe</th>
                <th className="px-5 py-3.5">Check-In / Out</th>
                <th className="px-5 py-3.5">Durasi</th>
                <th className="px-5 py-3.5 text-right">Tagihan</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredStays.map((stay) => {
                const member = members.find((m) => m.id === stay.memberId);
                return (
                  <tr key={stay.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-800">
                      {stay.bookingNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900">
                        {member?.fullName || 'Tamu Hotel'}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {member?.membershipNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-stone-900">
                        Kamar {stay.roomNumber}
                      </span>
                      <div className="text-[11px] text-stone-500">{stay.roomType}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <div>{formatDateIndo(stay.checkInDate)}</div>
                      <div className="text-[10px] text-stone-400">
                        s/d {formatDateIndo(stay.checkOutDate)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">{stay.nights} Malam</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-stone-900">
                      {formatIDR(stay.totalAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                          stay.status === 'checked_in'
                            ? 'bg-amber-100 text-amber-800'
                            : stay.status === 'checked_out'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {stay.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {stay.status === 'reserved' && (
                        <button
                          onClick={() => updateStayStatus(stay.id, 'checked_in')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-semibold"
                        >
                          Check-In
                        </button>
                      )}
                      {stay.status === 'checked_in' && (
                        <button
                          onClick={() => updateStayStatus(stay.id, 'checked_out')}
                          className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-[11px] font-semibold"
                        >
                          Check-Out
                        </button>
                      )}
                      {stay.status === 'checked_out' && (
                        <span className="text-[11px] text-stone-400 italic">Selesai</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Stay Recording Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Catat Kunjungan Menginap (Stay)"
        subtitle="Mencatat stay tamu untuk akumulasi malam menginap dan evaluasi tier"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Cari nama member, no. kartu, atau no. HP/WA..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nomor Kamar *
              </label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tipe Kamar
              </label>
              <select
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="Superior Room Twin">Superior Room Twin</option>
                <option value="Superior Pool View">Superior Pool View</option>
                <option value="Deluxe Garden View King">Deluxe Garden View King</option>
                <option value="Deluxe Family Pool Access">Deluxe Family Pool Access</option>
                <option value="Executive Garden Suite">Executive Garden Suite</option>
                <option value="Rinjani Suite with Balcony">Rinjani Suite with Balcony</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tanggal Check-In
              </label>
              <input
                type="date"
                value={formData.checkInDate}
                onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tanggal Check-Out
              </label>
              <input
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Jumlah Malam
              </label>
              <input
                type="number"
                min="1"
                value={formData.nights}
                onChange={(e) =>
                  setFormData({ ...formData, nights: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Total Tagihan Akomodasi (IDR) *
              </label>
              <input
                type="number"
                value={formData.totalAmount}
                onChange={(e) =>
                  setFormData({ ...formData, totalAmount: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Sumber Reservasi
              </label>
              <select
                value={formData.bookingSource}
                onChange={(e: any) =>
                  setFormData({ ...formData, bookingSource: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="Direct Website">Direct Website</option>
                <option value="Front Desk">Front Desk</option>
                <option value="Corporate">Corporate</option>
                <option value="OTA - Agoda">OTA - Agoda</option>
                <option value="OTA - Booking.com">OTA - Booking.com</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Status Menginap
              </label>
              <select
                value={formData.status}
                onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="checked_in">Checked In</option>
                <option value="reserved">Reserved</option>
                <option value="checked_out">Checked Out</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs"
            >
              Simpan Pencatatan Stay
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
