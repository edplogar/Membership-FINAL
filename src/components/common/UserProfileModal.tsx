import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from './Modal';
import { DevicePhotoUploader } from './DevicePhotoUploader';
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Building2,
  Briefcase,
  ShieldCheck,
  Calendar,
  MapPin,
  Camera,
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  Award,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, currentMember, userRole, updateUserProfile } = useAuth();
  const { tiers } = useApp();
  const { showToast } = useToast();

  const isStaffOrAdmin = userRole !== 'MEMBER';

  // Active sub-tab inside the profile modal
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'info'>('profile');

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'L' | 'P' | 'OTHER'>('L');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load current user & member data into state when modal opens
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setUsername(
        currentUser.username ||
          (currentUser.role === 'SUPER_ADMIN'
            ? 'superadmin'
            : currentUser.role === 'ADMIN'
            ? 'admin'
            : currentUser.email.split('@')[0])
      );
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || currentMember?.phone || '');
      setAvatar(currentUser.avatar || currentMember?.avatar || '');
      setDepartment(
        currentUser.department ||
          (currentUser.role === 'SUPER_ADMIN'
            ? 'Executive Management & IT'
            : currentUser.role === 'ADMIN'
            ? 'Front Office & Loyalty CRM'
            : '')
      );
      setJobTitle(
        currentUser.jobTitle ||
          (currentUser.role === 'SUPER_ADMIN'
            ? 'General Manager & Super Admin'
            : currentUser.role === 'ADMIN'
            ? 'Front Office Manager'
            : '')
      );

      if (currentMember) {
        setNickname(currentMember.nickname || currentUser.name.split(' ')[0]);
        setBirthDate(currentMember.birthDate || '');
        setGender(currentMember.gender || 'L');
        setAddress(currentMember.address || '');
        setCity(currentMember.city || '');
      }
    }
    setNewPassword('');
    setConfirmPassword('');
    setActiveTab('profile');
  }, [currentUser, currentMember, isOpen]);

  if (!isOpen || !currentUser) return null;

  const currentTier = tiers.find((t) => t.id === currentMember?.tierId) || tiers[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Nama lengkap tidak boleh kosong.', 'error');
      return;
    }

    if (!username.trim()) {
      showToast('Username tidak boleh kosong.', 'error');
      return;
    }

    if (!email.trim()) {
      showToast('Alamat email tidak boleh kosong.', 'error');
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

    updateUserProfile({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatar: avatar.trim() || undefined,
      department: isStaffOrAdmin ? department.trim() : undefined,
      jobTitle: isStaffOrAdmin ? jobTitle.trim() : undefined,
      password: newPassword ? newPassword.trim() : undefined,
      address: !isStaffOrAdmin ? address.trim() : undefined,
      city: !isStaffOrAdmin ? city.trim() : undefined,
      birthDate: !isStaffOrAdmin ? birthDate : undefined,
      gender: !isStaffOrAdmin ? gender : undefined,
    });

    showToast(
      isStaffOrAdmin
        ? 'Profil staf/manajemen berhasil diperbarui!'
        : 'Profil member berhasil diperbarui!',
      'success'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isStaffOrAdmin
          ? `Edit Profil Staf: ${currentUser.name}`
          : `Edit Profil Member: ${currentUser.name}`
      }
      subtitle="Kelola identitas, data kontak, username login, serta keamanan akun Anda"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Profile Header Card - Responsive & Non-overlapping */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-800 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-[#00A651] shadow-md"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 border-2 border-emerald-500/50 flex items-center justify-center font-bold text-xl text-emerald-100 shadow-md">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00A651] ring-2 ring-stone-900 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-stone-100 truncate max-w-[220px] sm:max-w-[280px]">
                  {name || 'Nama Pengguna'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider shrink-0 ${
                    userRole === 'SUPER_ADMIN'
                      ? 'bg-amber-400 text-stone-950 shadow-xs'
                      : userRole === 'ADMIN'
                      ? 'bg-emerald-400 text-stone-950 shadow-xs'
                      : userRole === 'OPERATOR_FO'
                      ? 'bg-blue-400 text-stone-950 shadow-xs'
                      : userRole === 'OPERATOR_FB'
                      ? 'bg-purple-400 text-stone-950 shadow-xs'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {userRole === 'SUPER_ADMIN'
                    ? 'Super Administrator'
                    : userRole === 'ADMIN'
                    ? 'Hotel Admin'
                    : userRole === 'OPERATOR_FO'
                    ? 'Operator FO'
                    : userRole === 'OPERATOR_FB'
                    ? 'Operator F&B'
                    : currentTier?.name || 'Member'}
                </span>
              </div>

              <div className="text-xs text-stone-400 font-mono mt-1 truncate">
                <span className="text-emerald-400 font-semibold">@{username || 'username'}</span>
                <span className="mx-1.5 text-stone-600">&bull;</span>
                <span className="text-stone-300">{email}</span>
              </div>

              {isStaffOrAdmin && (department || jobTitle) && (
                <div className="text-[11px] text-emerald-300 mt-1 flex flex-wrap items-center gap-1.5">
                  <Briefcase className="w-3 h-3 text-[#00A651] shrink-0" />
                  <span className="truncate">
                    {jobTitle}
                    {department ? ` &bull; ${department}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isStaffOrAdmin && currentMember && (
            <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800">
              <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                Poin Loyalitas
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-amber-400">
                {currentMember.availablePoints.toLocaleString('id-ID')} Poin
              </div>
              <div className="text-[10px] text-stone-400 font-mono">
                {currentMember.membershipNumber}
              </div>
            </div>
          )}
        </div>

        {/* Tab Switcher - Segmented Bar */}
        <div className="p-1 bg-stone-100 rounded-xl flex items-center gap-1 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Data Profil & Kontak</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Keamanan & Password</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Detail Akun & Role</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TAB 1: DATA PROFIL & KONTAK */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Row 1: Nama & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama lengkap"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Username Login * (Email/Username)
                  </label>
                  <div className="relative">
                    <span className="text-stone-400 font-mono text-xs absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none font-bold">
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) =>
                        setUsername(
                          e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')
                        )
                      }
                      placeholder="username unik"
                      className="w-full pl-8.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email & Nomor Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alamat Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+62 812xxxx"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Staff-Specific Fields */}
              {isStaffOrAdmin && (
                <div className="pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2.5">
                    Informasi Penugasan Hotel
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Departemen Hotel
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Contoh: Front Office, F&B, IT"
                          className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Jabatan / Posisi
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="Contoh: Front Desk Manager, IT Supervisor"
                          className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Member-Specific Fields */}
              {!isStaffOrAdmin && (
                <div className="pt-2 space-y-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Biodata & Domisili Member
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                        <span>Tanggal Lahir *</span>
                        <span className="text-[10px] text-amber-600 font-normal">🎁 Bonus +300 Poin Ultah</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Jenis Kelamin
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all cursor-pointer"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                        <option value="OTHER">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Alamat Domisili
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Alamat lengkap tempat tinggal"
                          className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Kota Asal
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Contoh: Mataram, Jakarta, Denpasar"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Avatar via Direct Local Device Upload */}
              <div className="pt-2 border-t border-stone-100">
                <DevicePhotoUploader
                  currentPhoto={avatar}
                  onPhotoChange={(newPhoto) => setAvatar(newPhoto)}
                  userName={name || 'User'}
                  label="Foto Profil Akun (Upload dari Komputer / HP Lokal)"
                />
              </div>
            </div>
          )}

          {/* TAB 2: KEAMANAN & PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Tips Keamanan:</strong> Kosongkan kolom kata sandi jika Anda <strong>tidak ingin mengubah</strong> kata sandi akun saat ini. Pastikan kata sandi minimal 6 karakter.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-9.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETAIL AKUN & ROLE */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                    ID Pengguna
                  </div>
                  <div className="font-mono font-semibold text-stone-900 truncate">{currentUser.id}</div>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                    Status Akun
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00A651]" />
                    <span>Aktif & Terverifikasi</span>
                  </div>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                    Tanggal Terdaftar
                  </div>
                  <div className="font-mono text-stone-700">
                    {new Date(currentUser.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                    Terakhir Masuk
                  </div>
                  <div className="font-mono text-stone-700">
                    {currentUser.lastLogin
                      ? new Date(currentUser.lastLogin).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Sesi Aktif'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-start sm:items-center gap-3.5">
                <div className="p-2.5 bg-emerald-700 text-white rounded-xl shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-950">
                    Tingkat Akses: {userRole}
                  </div>
                  <div className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                    {userRole === 'SUPER_ADMIN'
                      ? 'Akses penuh ke seluruh konfigurasi sistem, database, audit, dan WhatsApp CRM.'
                      : userRole === 'ADMIN'
                      ? 'Akses operasional reservasi, transaksi Front Desk, scanner, dan penukaran poin.'
                      : userRole === 'OPERATOR_FO'
                      ? 'Akses operasional Front Desk, check-in stay, transaksi, dan verifikasi voucher.'
                      : userRole === 'OPERATOR_FB'
                      ? 'Akses posting bill transaksi resto/bar dan verifikasi voucher belanja.'
                      : 'Akses kartu keanggotaan digital, katalog reward, dan riwayat menginap.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions - Sticky at bottom with elevation */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs py-3 -mb-1 flex items-center justify-end gap-3 border-t border-stone-200 z-20 shadow-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-[#00A651] hover:bg-[#009647] text-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-emerald-500/20 active:scale-95"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Simpan Perubahan Profil</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
