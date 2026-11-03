import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { User, UserRoleType } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { DevicePhotoUploader } from '../common/DevicePhotoUploader';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  KeyRound,
  UserCheck,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Lock,
  Camera,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminUsersManagement: React.FC = () => {
  const { users, roles, saveUser, deleteUser } = useApp();
  const { currentUser, updateAdministrator, switchDemoRole } = useAuth();
  const { showToast } = useToast();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    department: '',
    jobTitle: '',
    role: 'ADMIN' as UserRoleType,
    roleId: 'role_hotel_admin',
    password: '',
    avatar: '',
    isActive: true,
  });

  const adminUsers = users.filter((u) => u.role !== 'MEMBER');

  const handleOpenAdd = () => {
    setForm({
      name: '',
      username: '',
      email: '',
      phone: '',
      department: 'Front Office',
      jobTitle: 'Front Desk Officer',
      role: 'ADMIN',
      roleId: 'role_hotel_admin',
      password: '',
      avatar: '',
      isActive: true,
    });
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      username: u.username || (u.role === 'SUPER_ADMIN' ? 'superadmin' : u.role === 'ADMIN' ? 'admin' : u.email.split('@')[0]),
      email: u.email,
      phone: u.phone || '',
      department: u.department || (u.role === 'SUPER_ADMIN' ? 'Executive Management & IT' : 'Front Office & CRM'),
      jobTitle: u.jobTitle || (u.role === 'SUPER_ADMIN' ? 'General Manager & Super Admin' : 'Hotel Front Office Admin'),
      role: u.role,
      roleId: u.roleId,
      password: '', // Leave blank unless changing
      avatar: u.avatar || '',
      isActive: u.isActive,
    });
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.username.trim()) {
      showToast('Harap lengkapi nama lengkap, username, dan email.', 'error');
      return;
    }

    const cleanUsername = form.username.toLowerCase().trim();

    if (editingUser) {
      const updatedUser: User = {
        ...editingUser,
        name: form.name.trim(),
        username: cleanUsername,
        email: form.email.trim(),
        phone: form.phone.trim() || '',
        department: form.department.trim() || '',
        jobTitle: form.jobTitle.trim() || '',
        role: form.role,
        roleId: form.roleId,
        avatar: form.avatar.trim() || '',
        isActive: form.isActive,
        password: form.password ? form.password.trim() : editingUser.password,
      };

      saveUser(updatedUser);
      updateAdministrator(updatedUser.id, updatedUser);
      showToast(`Akun administrator "${updatedUser.name}" berhasil diperbarui dan disinkronkan ke cloud.`, 'success');
      setEditingUser(null);
    } else {
      const newAdmin: User = {
        id: `usr_adm_${Date.now()}`,
        name: form.name.trim(),
        username: cleanUsername,
        email: form.email.trim(),
        phone: form.phone.trim() || '',
        department: form.department.trim() || 'Front Office & CRM',
        jobTitle: form.jobTitle.trim() || 'Hotel Administrator',
        role: form.role,
        roleId: form.roleId,
        avatar: form.avatar.trim() || '',
        isActive: form.isActive,
        password: form.password ? form.password.trim() : 'admin123',
        createdAt: new Date().toISOString(),
      };

      saveUser(newAdmin);
      updateAdministrator(newAdmin.id, newAdmin);
      showToast(`Administrator baru "${newAdmin.name}" berhasil dibuat dan disinkronkan ke cloud.`, 'success');
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Pengelolaan & Edit Akun Administrator
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola data akun staf, edit username login, email, peran, dan reset kata sandi administrator.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser && (
            <button
              onClick={() => handleEdit(currentUser)}
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Edit Akun Administrator Saya"
            >
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>Edit Akun Saya ({currentUser.name.split(' ')[0]})</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Admin Baru</span>
          </button>
        </div>
      </div>

      {/* Active Admin Profile Banner */}
      {currentUser && (
        <div className="p-4 bg-gradient-to-r from-stone-900 via-stone-950 to-emerald-950 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-800 shadow-md">
          <div className="flex items-center gap-3.5">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-800 border-2 border-emerald-600 flex items-center justify-center font-bold text-base text-emerald-200">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-stone-100">{currentUser.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-amber-400 text-stone-950">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-xs text-stone-300 font-mono mt-0.5">
                Username Login: <strong className="text-emerald-300">@{currentUser.username || 'superadmin'}</strong> &bull; {currentUser.email}
              </div>
              {currentUser.jobTitle && (
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {currentUser.jobTitle} {currentUser.department ? `&bull; ${currentUser.department}` : ''}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleEdit(currentUser)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-stone-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10 self-start sm:self-center"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Profil Administrator Ini</span>
          </button>
        </div>
      )}

      {/* Admin Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Nama Administrator</th>
                <th className="px-5 py-3.5">Username Login</th>
                <th className="px-5 py-3.5">Email Akun</th>
                <th className="px-5 py-3.5">Peran (Role)</th>
                <th className="px-5 py-3.5">Departemen & Jabatan</th>
                <th className="px-5 py-3.5">No. Kontak</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Aksi Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {adminUsers.map((u) => {
                const roleObj = roles.find((r) => r.id === u.roleId);
                const isSuper = u.role === 'SUPER_ADMIN';
                const isCurrent = currentUser?.id === u.id;
                const displayUsername =
                  u.username ||
                  (u.role === 'SUPER_ADMIN' ? 'superadmin' : u.role === 'ADMIN' ? 'admin' : u.email.split('@')[0]);

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isCurrent ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-stone-50/60'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover border border-stone-300"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 font-bold flex items-center justify-center">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            ID: {u.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-1 bg-stone-100 border border-stone-200 rounded-lg text-emerald-800 font-mono font-bold text-xs">
                        @{displayUsername}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-stone-700">
                      {u.email}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'ADMIN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.role === 'OPERATOR_FO'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {roleObj?.name || u.role}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-stone-600">
                      <div className="font-medium text-stone-800">{u.jobTitle || 'Staf Hotel'}</div>
                      <div className="text-[10px] text-stone-400">{u.department || 'Operasional'}</div>
                    </td>

                    <td className="px-5 py-3.5 text-stone-500 font-mono">
                      {u.phone || '-'}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              switchDemoRole(u.id);
                              showToast(`Beralih ke akun ${u.name} (${roleObj?.name || u.role}). Hak akses langsung aktif.`, 'info');
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Uji langsung hak akses akun ini"
                          >
                            <KeyRound className="w-3 h-3 text-emerald-700" />
                            <span>Uji Akses</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(u)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          title="Edit Akun Administrator"
                        >
                          <Edit2 className="w-3 h-3 text-[#00A651]" />
                          <span>Edit</span>
                        </button>
                        {!isSuper && (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Akun"
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
      </div>

      {/* Add / Edit Admin Modal */}
      {(isAddModalOpen || editingUser) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingUser(null);
          }}
          title={
            editingUser
              ? `Edit Akun Administrator: ${editingUser.name}`
              : 'Buat Akun Administrator Baru'
          }
          subtitle="Atur nama lengkap, username login fleksibel, hak akses, dan kata sandi"
          maxWidth="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Hendra Wijaya, CHA"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Username Akun * (Untuk Login Simpel)
                </label>
                <div className="relative">
                  <span className="text-stone-400 font-mono text-xs absolute left-3 top-1/2 -translate-y-1/2">
                    @
                  </span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''),
                      })
                    }
                    placeholder="contoh: superadmin, admin"
                    className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Akun *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@lombokgardenhotel.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+62 812xxxx"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Departemen Hotel
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Executive, Front Office, IT, F&B"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Jabatan / Posisi Kerja
                </label>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  placeholder="General Manager, Front Office Manager"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Peran Hak Akses (Role)
              </label>
              <select
                value={form.roleId}
                onChange={(e) => {
                  const roleObj = roles.find((r) => r.id === e.target.value);
                  setForm({
                    ...form,
                    roleId: e.target.value,
                    role: (roleObj?.code as UserRoleType) || 'ADMIN',
                  });
                }}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              >
                {roles
                  .filter((r) => r.code !== 'MEMBER')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
              </select>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {editingUser ? 'Ubah Kata Sandi (Kosongkan jika tidak diubah)' : 'Kata Sandi Awal *'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingUser ? 'Masukkan kata sandi baru untuk mengganti' : 'Minimal 6 karakter (default: admin123)'}
                  className="w-full pl-9 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required={!editingUser}
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

            {/* Avatar via Direct Local Device Upload */}
            <div className="pt-1">
              <DevicePhotoUploader
                currentPhoto={form.avatar}
                onPhotoChange={(newPhoto) => setForm({ ...form, avatar: newPhoto })}
                userName={form.name || 'Admin'}
                label="Foto Profil Administrator (Upload Langsung dari Perangkat Lokal)"
              />
            </div>

            {/* Status Aktif */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-[#00A651] focus:ring-[#00A651]"
                />
                <span className="font-semibold text-stone-800">
                  Status Akun Administrator Aktif
                </span>
              </label>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-[#00A651] hover:bg-[#009647] text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Simpan Akun Administrator</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Confirm */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) deleteUser(userToDelete.id);
          setUserToDelete(null);
        }}
        title={`Hapus Administrator ${userToDelete?.name}?`}
        message="Akun ini tidak akan dapat login lagi ke dalam sistem hotel."
        confirmText="Hapus Akun"
        isDestructive
      />
    </div>
  );
};
