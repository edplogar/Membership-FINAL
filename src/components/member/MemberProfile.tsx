import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { formatDateIndo } from '../../services/membershipEngine';
import { DevicePhotoUploader } from '../common/DevicePhotoUploader';
import {
  User,
  Phone,
  MapPin,
  Share2,
  Copy,
  Check,
  Shield,
  Mail,
  Lock,
  Camera,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export const MemberProfile: React.FC = () => {
  const { currentMember, currentUser, updateUserProfile } = useAuth();
  const { updateMember } = useApp();
  const { showToast } = useToast();

  const member = currentMember || {
    id: 'mem_john_doe',
    membershipNumber: 'LGH-001088',
    fullName: 'Johnathan Doe',
    nickname: 'John',
    username: 'johnathan',
    email: 'member@example.com',
    phone: '+62 812-3456-7890',
    gender: 'L' as const,
    birthDate: '1988-06-15',
    address: 'Jl. Sunset Road No. 88, Kuta',
    city: 'Denpasar',
    province: 'Bali',
    country: 'Indonesia',
    idCardNumber: '3201123456780001',
    registrationDate: '2025-01-10',
    membershipStartDate: '2025-01-10',
    membershipEndDate: '2027-01-10',
    tierId: 'tier_gold',
    status: 'ACTIVE' as const,
    totalVisits: 9,
    totalTransactions: 14,
    totalSpending: 28750000,
    totalPointsEarned: 4312,
    availablePoints: 3250,
    redeemedPoints: 1062,
    referralCode: 'JOHN-LGH',
    internalNotes: '',
    avatar: '',
  };

  const [formData, setFormData] = useState({
    fullName: member.fullName,
    nickname: member.nickname,
    username: member.username || currentUser?.username || member.email.split('@')[0],
    email: member.email,
    phone: member.phone,
    address: member.address,
    city: member.city,
    birthDate: member.birthDate,
    gender: member.gender,
    avatar: member.avatar || currentUser?.avatar || '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.username.trim()) {
      showToast('Harap lengkapi nama lengkap, username, dan email.', 'error');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        showToast('Kata sandi baru minimal 6 karakter.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('Konfirmasi kata sandi baru tidak cocok.', 'error');
        return;
      }
    }

    const cleanUsername = formData.username.toLowerCase().trim();

    // 1. Update Member via AppContext
    updateMember(member.id, {
      fullName: formData.fullName.trim(),
      nickname: formData.nickname.trim(),
      username: cleanUsername,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      birthDate: formData.birthDate,
      gender: formData.gender,
      avatar: formData.avatar.trim() || undefined,
      password: newPassword ? newPassword.trim() : undefined,
    });

    // 2. Update Auth User & Member via AuthContext
    updateUserProfile({
      name: formData.fullName.trim(),
      username: cleanUsername,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      birthDate: formData.birthDate,
      gender: formData.gender,
      avatar: formData.avatar.trim() || undefined,
      password: newPassword ? newPassword.trim() : undefined,
    });

    showToast('Profil member dan username login berhasil disimpan!', 'success');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(member.referralCode);
    setCopied(true);
    showToast('Kode referral berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-200">
      <div>
        <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
          Profil & Pengaturan Akun Member
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Kelola data pribadi Anda, sesuaikan username login simpel, dan bagikan kode referral Anda.
        </p>
      </div>

      {/* Referral Card Banner */}
      <div className="p-6 bg-gradient-to-r from-stone-900 via-stone-950 to-emerald-950 text-white rounded-2xl border border-stone-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-semibold">
            PROGRAM REFERRAL MEMBER
          </div>
          <h3 className="font-serif-luxury text-lg font-bold mt-1">
            Ajak Sahabat & Dapatkan +500 Poin
          </h3>
          <p className="text-xs text-stone-300 mt-1 max-w-md">
            Bagikan kode unik Anda kepada teman. Anda mendapatkan +500 poin dan
            teman Anda menerima bonus +250 poin saat pertama mendaftar.
          </p>
        </div>

        <div className="bg-stone-900/90 p-3.5 rounded-xl border border-stone-700 flex items-center gap-3 shrink-0">
          <div className="font-mono text-base font-bold text-amber-300 tracking-wider">
            {member.referralCode}
          </div>
          <button
            type="button"
            onClick={handleCopyReferral}
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors cursor-pointer"
            title="Salin Kode Referral"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-stone-100">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt={formData.fullName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-600 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-900 text-amber-300 font-serif-luxury text-xl font-bold flex items-center justify-center shadow-sm">
                {formData.fullName.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                {formData.fullName}
              </h3>
              <div className="text-xs font-mono text-stone-500 mt-0.5">
                Username: <strong className="text-emerald-700">@{formData.username}</strong> &bull; Nomor: {member.membershipNumber} · Bergabung sejak{' '}
                {formatDateIndo(member.registrationDate)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Username Login * (Untuk Login Praktis)
              </label>
              <div className="relative">
                <span className="text-stone-400 font-mono text-xs absolute left-3.5 top-1/2 -translate-y-1/2">
                  @
                </span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''),
                    })
                  }
                  className="w-full pl-8 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                Dapat digunakan langsung untuk masuk di halaman login.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Panggilan
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Alamat Email Akun *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nomor WhatsApp / HP *
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Tanggal Lahir (Benefit Ulang Tahun)
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Jenis Kelamin
              </label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Kota / Domisili
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Contoh: Mataram, Denpasar, Jakarta"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Alamat Tinggal Lengkap
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              />
            </div>

            <div className="sm:col-span-2 pt-1">
              <DevicePhotoUploader
                currentPhoto={formData.avatar}
                onPhotoChange={(newPhoto) => setFormData({ ...formData, avatar: newPhoto })}
                userName={formData.fullName || 'Member'}
                label="Foto Profil Member (Upload Langsung dari Perangkat Lokal)"
              />
            </div>
          </div>

          {/* Password update section */}
          <div className="pt-6 border-t border-stone-100 space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#00A651]" />
              <span>Ganti Kata Sandi (Opsional)</span>
            </h4>
            <p className="text-xs text-stone-500">
              Kosongkan bagian ini jika Anda tidak ingin mengubah kata sandi akun Anda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#00A651] hover:bg-[#009647] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Simpan Perubahan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
