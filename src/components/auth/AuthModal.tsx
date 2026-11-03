import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Member } from '../../types';
import { Modal } from '../common/Modal';
import { LombokGardenLogo } from '../common/LombokGardenLogo';
import { MemberCardSuccessModal } from '../common/MemberCardSuccessModal';
import { sendFirebasePasswordResetEmail } from '../../services/firebase';
import { Lock, Mail, AlertCircle, CheckCircle2, Send, Clock, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { login, findAccountByIdentifier } = useAuth();
  const { addMember, tiers } = useApp();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  const [newlyRegisteredMember, setNewlyRegisteredMember] = useState<Member | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Register form state
  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '1995-05-15',
    gender: 'L' as 'L' | 'P',
    address: 'Mataram, Lombok',
    city: 'Mataram',
    province: 'Nusa Tenggara Barat',
    country: 'Indonesia',
    idCardNumber: '',
    password: '',
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Harap masukkan email dan kata sandi Anda.');
      return;
    }

    const success = login(loginEmail.trim(), loginPassword);
    if (success) {
      showToast('Berhasil masuk ke sistem Lombok Garden Hotel!', 'success');
      onClose();
    } else {
      setErrorMessage('Email atau kata sandi tidak cocok. Silakan periksa kembali akun Anda.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const clean = loginEmail.trim();
    if (!clean) {
      setErrorMessage('Harap masukkan alamat email atau username Anda.');
      return;
    }

    setIsSendingReset(true);
    try {
      const found = findAccountByIdentifier(clean);
      const targetEmail = found?.email || clean;
      await sendFirebasePasswordResetEmail(targetEmail, {
        name: found?.name,
        phone: found?.phone,
        membershipNumber: found?.membershipNumber,
      });
      setForgotSent(true);
      showToast(`Tautan dan instruksi reset kata sandi telah dikirim ke ${targetEmail}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Gagal mengirim tautan reset: ${msg}`);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!regForm.fullName || !regForm.email || !regForm.phone) {
      setErrorMessage('Harap lengkapi nama lengkap, email, dan nomor WhatsApp.');
      return;
    }

    const now = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 24 * 30 * 86400000).toISOString().slice(0, 10);

    const newMember = addMember({
      fullName: regForm.fullName.trim(),
      nickname: regForm.fullName.trim().split(' ')[0],
      email: regForm.email.trim().toLowerCase(),
      phone: regForm.phone.trim(),
      gender: regForm.gender,
      birthDate: regForm.birthDate,
      address: regForm.address,
      city: regForm.city,
      province: regForm.province,
      country: regForm.country,
      idCardNumber: regForm.idCardNumber || '5201000000000000',
      tierId: 'tier_member',
      registrationDate: now,
      membershipStartDate: now,
      membershipEndDate: end,
      referralCode: `${regForm.fullName.slice(0, 4).toUpperCase()}-LGH`,
      status: 'ACTIVE',
      internalNotes: 'Pendaftaran mandiri melalui portal web.',
    });

    setNewlyRegisteredMember(newMember);
    showToast('Registrasi berhasil! Selamat bergabung di Lombok Garden Hotel.', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="md"
    >
      <div className="space-y-5 -mt-2">
        {/* Official Brand Header */}
        <div className="flex flex-col items-center text-center pb-3 border-b border-stone-100">
          <LombokGardenLogo variant="vertical" size="md" />
          <h3 className="font-serif text-lg font-bold text-stone-900 mt-2">
            {mode === 'login' && 'Masuk ke Portal Keanggotaan'}
            {mode === 'register' && 'Pendaftaran Member Baru'}
            {mode === 'forgot' && 'Pemulihan Kata Sandi'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mt-0.5">
            {mode === 'login' && 'Masukkan kredensial akun Anda untuk melanjutkan.'}
            {mode === 'register' && 'Daftar gratis untuk menikmati diskon kamar dan poin reward istimewa.'}
            {mode === 'forgot' && 'Masukkan email terdaftar untuk menerima tautan reset kata sandi.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <div className="space-y-4">
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email atau Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com atau username"
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setForgotSent(false);
                    }}
                    className="text-[11px] text-[#00A651] hover:underline"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#00A651] hover:bg-[#009647] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Masuk ke Akun
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-stone-600">
              Belum memiliki akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className="font-bold text-[#00A651] hover:underline cursor-pointer"
              >
                Daftar Member Baru
              </button>
            </div>
          </div>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={regForm.fullName}
                onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                placeholder="Sesuai KTP / Paspor"
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  WhatsApp *
                </label>
                <input
                  type="text"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="0812xxxx"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#00A651] hover:bg-[#009647] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              Daftar & Dapatkan Kartu Digital
            </button>

            <div className="text-center text-xs text-stone-600">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="font-bold text-[#00A651] hover:underline cursor-pointer"
              >
                Masuk di sini
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {forgotSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
                  <div className="font-bold text-xs">Tautan Reset Berhasil Dikirim!</div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Periksa kotak masuk email Anda untuk tautan pembuatan kata sandi baru.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotSent(false);
                  }}
                  className="w-full py-2 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email atau Username Akun Terdaftar *
                  </label>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com atau username"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-2.5 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingReset ? 'Mengirim...' : 'Kirim Tautan Reset'}</span>
                </button>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-stone-500 hover:underline"
                  >
                    Kembali ke Login
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Member Card Visualization Upon Initial Registration */}
      {newlyRegisteredMember && (
        <MemberCardSuccessModal
          isOpen={Boolean(newlyRegisteredMember)}
          onClose={() => {
            const mem = newlyRegisteredMember;
            setNewlyRegisteredMember(null);
            if (mem) {
              login(mem.email);
            }
            onClose();
          }}
          member={newlyRegisteredMember}
          tier={tiers.find((t) => t.id === newlyRegisteredMember.tierId) || tiers[0]}
          onContinue={() => {
            const mem = newlyRegisteredMember;
            setNewlyRegisteredMember(null);
            if (mem) {
              login(mem.email);
            }
            onClose();
          }}
          continueButtonText="Masuk ke Portal Member"
          title="Pendaftaran Berhasil! Kartu Membership Digital Telah Terbit 🎉"
        />
      )}
    </Modal>
  );
};
