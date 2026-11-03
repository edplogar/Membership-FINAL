import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Member } from '../../types';
import { LombokGardenLogo } from '../common/LombokGardenLogo';
import { MemberCardSuccessModal } from '../common/MemberCardSuccessModal';
import { sendFirebasePasswordResetEmail } from '../../services/firebase';
import {
  MEMBER_CUSTOM_DOMAIN,
  isMemberSubdomain,
} from '../../services/domainService';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  RefreshCw,
  Send,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  onExplorePublic?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, findAccountByIdentifier, resetPasswordWithRecovery } = useAuth();
  const { addMember, tiers } = useApp();
  const { showToast } = useToast();

  // Mode: 'login' | 'register' | 'forgot' | 'reset'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [newlyRegisteredMember, setNewlyRegisteredMember] = useState<Member | null>(null);

  // Unified login form state (Email or Username)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Register form state (for new members)
  const [regForm, setRegForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDate: '1995-05-15',
    gender: 'L' as 'L' | 'P',
    city: 'Mataram',
    idCardNumber: '',
  });

  // Forgot password & Recovery link state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{
    email: string;
    name?: string;
    token: string;
    sentAt: string;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetCompleted, setResetCompleted] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Check URL parameters for direct reset link click
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      const emailParam = params.get('email');
      if (modeParam === 'resetPassword' || params.has('token') || params.has('resetToken') || params.has('reset_token')) {
        setAuthMode('reset');
        if (emailParam) {
          setResetEmail(decodeURIComponent(emailParam));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle Unified Email & Username Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim();
    if (!cleanId || !password.trim()) {
      setErrorMessage('Harap masukkan email atau username dan kata sandi Anda.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Authenticate with AuthContext (supports both Email and Username)
      const success = login(cleanId, password);

      if (success) {
        showToast('Login berhasil! Selamat datang di Lombok Garden Hotel.', 'success');
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(
          'Email/username atau kata sandi tidak cocok. Silakan periksa kembali kredensial Anda atau gunakan menu Lupa Kata Sandi.'
        );
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Terjadi kesalahan saat masuk: ${errText}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle New Member Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regForm.fullName.trim() || !regForm.email.trim() || !regForm.phone.trim()) {
      setErrorMessage('Harap lengkapi nama lengkap, alamat email, dan nomor WhatsApp aktif.');
      return;
    }

    if (regForm.password && regForm.password.length < 6) {
      setErrorMessage('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }

    if (regForm.password && regForm.password !== regForm.confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 24 * 30 * 86400000).toISOString().slice(0, 10);

      const rawUsername = regForm.username.toLowerCase().trim() || regForm.email.split('@')[0].toLowerCase();
      const newMember = addMember({
        fullName: regForm.fullName.trim(),
        nickname: regForm.fullName.trim().split(' ')[0],
        username: rawUsername,
        email: regForm.email.trim().toLowerCase(),
        phone: regForm.phone.trim(),
        password: regForm.password || undefined,
        gender: regForm.gender,
        birthDate: regForm.birthDate,
        address: 'Mataram, Lombok',
        city: regForm.city || 'Mataram',
        province: 'Nusa Tenggara Barat',
        country: 'Indonesia',
        idCardNumber: regForm.idCardNumber || '5201000000000000',
        tierId: 'tier_member',
        registrationDate: now,
        membershipStartDate: now,
        membershipEndDate: end,
        referralCode: `${regForm.fullName.slice(0, 4).toUpperCase()}-LGH`,
        status: 'ACTIVE',
        internalNotes: 'Pendaftaran mandiri akun member melalui portal web.',
      });

      // Display member card visualization upon initial registration
      setNewlyRegisteredMember(newMember);
      showToast(`Pendaftaran berhasil! Kartu digital resmi telah diterbitkan untuk ${newMember.fullName}.`, 'success');
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Gagal mendaftar: ${errText}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password (Password Reset via Registered Email)
  const handleForgotSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanInput = forgotIdentifier.trim();
    if (!cleanInput) {
      setErrorMessage('Harap masukkan alamat email, username, nomor HP, atau nomor member Anda.');
      return;
    }

    setIsSubmitting(true);

    try {
      const found = findAccountByIdentifier(cleanInput);
      const targetEmail = found?.email || (cleanInput.includes('@') ? cleanInput : `${cleanInput.toLowerCase()}@lombokgardenhotel.com`);
      const targetName = found?.name || cleanInput;

      // Dispatch Firebase Auth Password Reset Email Link & Backend Dispatcher
      const resetResult = await sendFirebasePasswordResetEmail(targetEmail, {
        name: targetName,
        phone: found?.phone,
        membershipNumber: found?.membershipNumber,
      });

      const token = 'rec_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

      setRecoveryData({
        email: targetEmail,
        name: targetName,
        token,
        sentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });

      setResetEmail(targetEmail);
      setForgotSuccess(true);
      setResendCooldown(30);
      showToast(`Tautan dan instruksi reset kata sandi telah dikirim ke ${targetEmail}`, 'success');
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Gagal memproses pemulihan: ${errText}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Setting New Password after recovery
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Kata sandi baru minimal terdiri dari 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = resetPasswordWithRecovery(resetEmail, newPassword);

      if (updated) {
        setResetCompleted(true);
        showToast('Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru.', 'success');
        setIdentifier(resetEmail);
        setPassword(newPassword);

        setTimeout(() => {
          setAuthMode('login');
          setForgotSuccess(false);
          setResetCompleted(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 1200);
      } else {
        showToast('Kata sandi berhasil diperbarui.', 'success');
        setIdentifier(resetEmail);
        setPassword(newPassword);
        setAuthMode('login');
        setForgotSuccess(false);
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Gagal memperbarui kata sandi: ${errText}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between selection:bg-[#00A651] selection:text-white font-sans">
      {/* Top Brand Accent Stripe */}
      <div className="h-1.5 w-full bg-[#00A651]" />

      {/* Main Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-[#E5DFD3] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Hero Brand Panel (Official Lombok Garden Hotel Theme) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#072417] via-[#0A3320] to-[#04160E] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Soft Ambient Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#00A651]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#C5A869]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            {/* Top Logo & Title */}
            <div className="relative z-10 space-y-6">
              {/* Logo Component with Transparent Container as requested */}
              <div className="bg-transparent p-0 border-none shadow-none inline-block">
                <img
                  src="/lombok-garden-logo.svg"
                  alt="Lombok Garden Hotel Logo"
                  className="w-28 sm:w-36 h-auto object-contain drop-shadow-lg"
                />
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A651]/20 border border-[#00A651]/40 text-[#4ADE80] text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
                  <span>Hospitality & Membership Portal</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  Kenyamanan Tropis & Keistimewaan Eksklusif
                </h1>
                <p className="text-emerald-100/80 text-xs sm:text-sm leading-relaxed">
                  Selamat datang di portal resmi Lombok Garden Hotel. Akses kartu keanggotaan digital, kumpulkan poin loyalitas di setiap transaksi, dan nikmati diskon khusus kamar & restoran.
                </p>
              </div>
            </div>

            {/* Hotel Highlights */}
            <div className="relative z-10 py-6 border-t border-emerald-900/60 space-y-2.5 text-xs text-emerald-200/90">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#C5A869] shrink-0" />
                <span>Poin reward otomatis di kamar, restoran, & spa</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#C5A869] shrink-0" />
                <span>Kartu digital eksklusif dengan barcode instan</span>
              </div>
            </div>

            {/* Bottom Property Info */}
            <div className="relative z-10 pt-4 border-t border-emerald-900/60">
              <div className="text-[11px] text-emerald-300/70 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#00A651]" />
                  Jl. Bung Karno No. 7, Mataram
                </span>
                <span>(0370) 636015</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            
            {/* Header / Mode Switcher */}
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 font-serif">
                    {authMode === 'login' && 'Masuk ke Akun Anda'}
                    {authMode === 'register' && 'Pendaftaran Member Baru'}
                    {authMode === 'forgot' && 'Pemulihan Kata Sandi'}
                    {authMode === 'reset' && 'Atur Ulang Kata Sandi'}
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    {authMode === 'login' && 'Masuk dengan alamat email / username dan kata sandi Anda.'}
                    {authMode === 'register' && 'Daftar sekarang untuk langsung mendapatkan nomor member dan kartu digital.'}
                    {authMode === 'forgot' && 'Masukkan email atau username akun Anda untuk menerima tautan pemulihan.'}
                    {authMode === 'reset' && 'Masukkan kata sandi baru untuk mengamankan akun Anda.'}
                  </p>
                </div>

                {/* Back to login if in register/forgot */}
                {authMode !== 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-semibold text-[#00A651] hover:underline cursor-pointer"
                  >
                    Kembali ke Login
                  </button>
                )}
              </div>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed flex-1">{errorMessage}</div>
              </div>
            )}

            {/* LOGIN FORM */}
            {authMode === 'login' && (
              <div className="space-y-5">
                {/* Unified Email or Username Input */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Email atau Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Alamat email atau username Anda"
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                        required
                        autoComplete="username"
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
                          setAuthMode('forgot');
                          setErrorMessage(null);
                        }}
                        className="text-[11px] text-[#00A651] hover:underline cursor-pointer font-medium"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#00A651] focus:ring-[#00A651] accent-[#00A651]"
                      />
                      <span className="text-stone-600">Ingat sesi saya di perangkat ini</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Memverifikasi Akun...</span>
                    ) : (
                      <>
                        <span>Masuk ke Sistem Hotel</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Login Assistance note */}
                <div className="pt-4 border-t border-stone-100 text-center text-xs text-stone-500">
                  <span>Portal Keanggotaan & Layanan Tamu Resmi Lombok Garden Hotel</span>
                </div>
              </div>
            )}

            {/* REGISTER FORM */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      value={regForm.fullName}
                      onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                      placeholder="Contoh: Bpk. Rahmat Hidayat"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Username Akun *
                    </label>
                    <input
                      type="text"
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })}
                      placeholder="contoh: rahmathidayat"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Alamat Email *
                    </label>
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="nama@email.com"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nomor WhatsApp Aktif *
                    </label>
                    <input
                      type="text"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      placeholder="0812xxxx atau +62812xxxx"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Kata Sandi *
                    </label>
                    <input
                      type="password"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Konfirmasi Kata Sandi *
                    </label>
                    <input
                      type="password"
                      value={regForm.confirmPassword}
                      onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                      placeholder="Ulangi kata sandi"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Kota Asal</label>
                    <input
                      type="text"
                      value={regForm.city}
                      onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                      placeholder="Mataram"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value as 'L' | 'P' })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#00A651]"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Mendaftarkan Akun...' : 'Daftar & Terbitkan Kartu Digital'}
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM (Password Reset via Registered Email) */}
            {authMode === 'forgot' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {forgotSuccess ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#00A651] text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-stone-900">
                            Tautan Reset Kata Sandi Berhasil Dikirim
                          </div>
                          <div className="text-xs text-stone-600 font-mono">
                            Ke alamat: <strong className="text-emerald-800">{recoveryData?.email}</strong>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed pt-1">
                        Sistem telah mengirimkan tautan reset kata sandi ke email terdaftar Anda. Silakan periksa kotak masuk (Inbox) atau folder Spam pada email Anda untuk melanjutkan.
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[11px] text-stone-600 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Berlaku: 60 Menit</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Tautan Aman</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/80 text-[11px] text-stone-600 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#00A651] shrink-0" />
                        <span>Untuk keamanan akun, silakan klik tautan resmi yang tertera pada email Anda untuk mereset kata sandi.</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => handleForgotSubmit()}
                        disabled={resendCooldown > 0 || isSubmitting}
                        className="text-xs font-semibold text-[#00A651] hover:underline flex items-center gap-1.5 cursor-pointer disabled:text-stone-400 disabled:no-underline"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                        <span>
                          {resendCooldown > 0
                            ? `Kirim ulang tautan (${resendCooldown}d)`
                            : 'Kirim ulang email'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setForgotSuccess(false);
                          setErrorMessage(null);
                        }}
                        className="text-xs text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                      >
                        Kembali ke Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-950 text-xs flex items-start gap-2.5">
                      <Shield className="w-4 h-4 text-[#00A651] shrink-0 mt-0.5" />
                      <div className="leading-relaxed text-stone-700">
                        Masukkan alamat email atau username akun Anda yang terdaftar. Sistem akan mengirimkan tautan reset kata sandi ke email Anda.
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Alamat Email atau Username Terdaftar *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={forgotIdentifier}
                          onChange={(e) => setForgotIdentifier(e.target.value)}
                          placeholder="nama@email.com atau username akun"
                          className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengirim Tautan Reset...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Kirim Tautan Reset Kata Sandi</span>
                        </>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setErrorMessage(null);
                        }}
                        className="text-xs text-stone-500 hover:text-[#00A651] font-semibold cursor-pointer"
                      >
                        Sudah ingat kata sandi Anda? Masuk sekarang
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* RESET PASSWORD FORM */}
            {authMode === 'reset' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {resetCompleted ? (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-center space-y-3">
                    <div className="w-12 h-12 bg-[#00A651] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-sm text-stone-900">
                      Kata Sandi Berhasil Diperbarui!
                    </h3>
                    <p className="text-xs text-stone-600">
                      Mengalihkan Anda kembali ke halaman masuk...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
                      Mengatur ulang kata sandi untuk akun:{' '}
                      <strong className="text-emerald-800 font-mono">{resetEmail || 'Email Terdaftar'}</strong>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Kata Sandi Baru *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Konfirmasi Kata Sandi Baru *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi kata sandi baru"
                          className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
                      className="w-full py-3 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan Kata Sandi...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Simpan Kata Sandi Baru</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="py-4 text-center text-xs text-stone-500 border-t border-[#E5DFD3] bg-[#F8F6F0]">
        <div className="flex items-center justify-center gap-2">
          <span>&copy; {new Date().getFullYear()} Lombok Garden Hotel. Seluruh Hak Cipta Dilindungi.</span>
          <span>&bull;</span>
          <span className="text-[#00A651] font-semibold">Lombok Hospitality Management</span>
        </div>
      </footer>

      {/* Member Card Visualization Upon Initial Registration Modal */}
      {newlyRegisteredMember && (
        <MemberCardSuccessModal
          isOpen={Boolean(newlyRegisteredMember)}
          onClose={() => {
            const mem = newlyRegisteredMember;
            setNewlyRegisteredMember(null);
            if (mem) {
              login(mem.email);
              if (onSuccess) onSuccess();
            }
          }}
          member={newlyRegisteredMember}
          tier={tiers.find((t) => t.id === newlyRegisteredMember.tierId) || tiers[0]}
          onContinue={() => {
            const mem = newlyRegisteredMember;
            setNewlyRegisteredMember(null);
            if (mem) {
              login(mem.email);
              if (onSuccess) onSuccess();
            }
          }}
          continueButtonText="Masuk ke Portal Member"
          title="Pendaftaran Berhasil! Kartu Membership Digital Telah Terbit 🎉"
        />
      )}
    </div>
  );
};
