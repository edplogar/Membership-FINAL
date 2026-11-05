import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  calculateMemberBirthdayInfo,
  getUpcomingBirthdayMembers,
  generateBirthdaySpecialOffer,
  BirthdayMemberInfo,
  BirthdaySpecialOffer,
} from '../../services/birthdayService';
import { sendWhatsAppMessageViaPing } from '../../services/pingWhatsAppService';
import { sendMemberCustomNotificationEmail } from '../../services/emailService';
import { Modal } from '../common/Modal';
import {
  Cake,
  Gift,
  Calendar,
  Sparkles,
  Send,
  Mail,
  MessageSquare,
  Coins,
  Ticket,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  Award,
  PartyPopper,
  AlertCircle,
  Copy,
  Check,
  Flame,
} from 'lucide-react';
import { Member, MembershipTier, Voucher } from '../../types';

interface BirthdayNotificationWidgetProps {
  onNavigate?: (tab: string) => void;
  onSelectMember?: (member: Member) => void;
  compact?: boolean;
}

export const BirthdayNotificationWidget: React.FC<BirthdayNotificationWidgetProps> = ({
  onNavigate,
  onSelectMember,
  compact = false,
}) => {
  const {
    members,
    tiers,
    vouchers,
    pointRules,
    whatsappConfig,
    emailConfig,
    addWhatsAppLog,
    addEmailLog,
    adjustPoints,
    saveVoucher,
    claimVoucher,
  } = useApp();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  // Filter window: 7 days, 14 days, 30 days
  const [windowDays, setWindowDays] = useState<number>(30);
  const [filterScope, setFilterScope] = useState<'all' | 'today' | 'week'>('all');

  // Interactive Offer Modal State
  const [selectedBirthdayMember, setSelectedBirthdayMember] = useState<BirthdayMemberInfo | null>(null);
  const [offerDetails, setOfferDetails] = useState<BirthdaySpecialOffer | null>(null);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isAddingBonusPoints, setIsAddingBonusPoints] = useState(false);
  const [isGeneratingVoucher, setIsGeneratingVoucher] = useState(false);
  const [waSentSuccess, setWaSentSuccess] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [pointsGrantedSuccess, setPointsGrantedSuccess] = useState(false);
  const [voucherCreatedSuccess, setVoucherCreatedSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Compute all upcoming birthday members
  const upcomingList = useMemo(() => {
    return getUpcomingBirthdayMembers(members, 60);
  }, [members]);

  // Breakdown counts
  const todayCount = upcomingList.filter((b) => b.isToday).length;
  const weekCount = upcomingList.filter((b) => b.isThisWeek).length;
  const monthCount = upcomingList.filter((b) => b.isThisMonth).length;

  // Filtered members by active tab
  const displayList = useMemo(() => {
    if (filterScope === 'today') {
      return upcomingList.filter((b) => b.isToday);
    }
    if (filterScope === 'week') {
      return upcomingList.filter((b) => b.isThisWeek);
    }
    return upcomingList.filter((b) => b.daysUntil <= windowDays);
  }, [upcomingList, filterScope, windowDays]);

  // Open Offer Modal
  const handleOpenOfferModal = (bdayInfo: BirthdayMemberInfo) => {
    const tier = tiers.find((t) => t.id === bdayInfo.member.tierId) || tiers[0];
    const generated = generateBirthdaySpecialOffer(
      bdayInfo.member,
      tier,
      pointRules?.birthdayBonusPoints || 300
    );
    setSelectedBirthdayMember(bdayInfo);
    setOfferDetails(generated);
    setWaSentSuccess(false);
    setEmailSentSuccess(false);
    setPointsGrantedSuccess(false);
    setVoucherCreatedSuccess(false);
    setCopiedCode(false);
  };

  // 1. Send Special Offer via WhatsApp ping.co.id
  const handleSendWhatsAppOffer = async () => {
    if (!selectedBirthdayMember || !offerDetails) return;
    setIsSendingWa(true);
    try {
      const log = await sendWhatsAppMessageViaPing(
        selectedBirthdayMember.member.phone,
        selectedBirthdayMember.member.fullName,
        offerDetails.whatsappMessage,
        'voucher',
        whatsappConfig
      );
      addWhatsAppLog(log);
      setWaSentSuccess(true);
      showToast(
        `Penawaran spesial ulang tahun berhasil dikirim via WhatsApp ke ${selectedBirthdayMember.member.phone}!`,
        'success'
      );
    } catch {
      showToast('Gagal mengirim WhatsApp penawaran ulang tahun.', 'error');
    } finally {
      setIsSendingWa(false);
    }
  };

  // 2. Send Special Offer via Email
  const handleSendEmailOffer = async () => {
    if (!selectedBirthdayMember || !offerDetails) return;
    setIsSendingEmail(true);
    try {
      const log = await sendMemberCustomNotificationEmail(
        selectedBirthdayMember.member.email,
        selectedBirthdayMember.member.fullName,
        offerDetails.emailSubject,
        offerDetails.emailBody,
        emailConfig,
        selectedBirthdayMember.member.membershipNumber
      );
      addEmailLog(log);
      setEmailSentSuccess(true);
      showToast(
        `Email ucapan & penawaran ulang tahun terkirim ke ${selectedBirthdayMember.member.email}!`,
        'success'
      );
    } catch {
      showToast('Gagal mengirim email penawaran ulang tahun.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 3. Grant Loyalty Bonus Points (+300 Pts)
  const handleGrantBonusPoints = () => {
    if (!selectedBirthdayMember || !offerDetails) return;
    setIsAddingBonusPoints(true);
    try {
      const bonusAmount = offerDetails.pointsBonus || 300;
      adjustPoints(
        selectedBirthdayMember.member.id,
        bonusAmount,
        true,
        `Bonus Spesial Hari Ulang Tahun ke-${selectedBirthdayMember.turningAge} (${bonusAmount} Poin)`
      );
      setPointsGrantedSuccess(true);
      showToast(
        `+${bonusAmount} Poin bonus ulang tahun berhasil ditambahkan ke saldo ${selectedBirthdayMember.member.fullName}!`,
        'success'
      );
    } catch {
      showToast('Gagal mengkreditkan poin bonus.', 'error');
    } finally {
      setIsAddingBonusPoints(false);
    }
  };

  // 4. Issue Special Birthday Voucher
  const handleIssueBirthdayVoucher = () => {
    if (!selectedBirthdayMember || !offerDetails) return;
    setIsGeneratingVoucher(true);
    try {
      const tier = tiers.find((t) => t.id === selectedBirthdayMember.member.tierId) || tiers[0];
      const today = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + offerDetails.validityDays);

      const existingVoucher = vouchers.find((v) => v.code === offerDetails.voucherCode);
      let targetVoucherId = existingVoucher?.id;

      if (!existingVoucher) {
        const newVoucherId = `vch_bday_${Date.now()}`;
        const newVoucher: Voucher = {
          id: newVoucherId,
          code: offerDetails.voucherCode,
          title: offerDetails.voucherTitle,
          description: `Diskon spesial ${offerDetails.voucherDiscountPercent}% F&B & Kamar untuk perayaan ulang tahun member ${selectedBirthdayMember.member.fullName}. Termasuk Complimentary Birthday Cake.`,
          type: 'percent',
          discountValue: offerDetails.voucherDiscountPercent,
          minTransaction: 100000,
          maxDiscount: 500000,
          startDate: today.toISOString().split('T')[0],
          expiryDate: expiry.toISOString().split('T')[0],
          usageLimit: 1,
          usedCount: 0,
          perMemberLimit: 1,
          applicableTierIds: [tier.id],
          status: 'active',
        };
        saveVoucher(newVoucher);
        targetVoucherId = newVoucherId;
      }

      // Claim voucher into member wallet
      if (targetVoucherId) {
        claimVoucher(selectedBirthdayMember.member.id, targetVoucherId);
      }
      setVoucherCreatedSuccess(true);
      showToast(
        `Voucher ulang tahun ${offerDetails.voucherCode} berhasil diterbitkan & dimasukkan ke dompet member!`,
        'success'
      );
    } catch {
      showToast('Gagal menerbitkan voucher ulang tahun.', 'error');
    } finally {
      setIsGeneratingVoucher(false);
    }
  };

  const handleCopyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast('Kode voucher berhasil disalin!', 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Main Alert Card / Widget */}
      <div className="bg-gradient-to-br from-[#0c2e1f] via-[#082417] to-stone-900 text-white rounded-2xl border-2 border-emerald-500/50 p-5 sm:p-6 shadow-md relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Cake className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Automated Birthday Alert
                </span>
                {todayCount > 0 && (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-400/50 flex items-center gap-1 animate-pulse">
                    <PartyPopper className="w-3 h-3" />
                    {todayCount} Ultah Hari Ini!
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-serif-luxury font-bold text-white tracking-tight mt-1 flex items-center gap-2">
                Notifikasi Ulang Tahun Tamu & Penawaran Spesial
              </h2>
            </div>
          </div>

          {/* Scope Filters Pill */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-emerald-500/30 text-xs font-semibold self-start md:self-center">
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-[#00A651] text-white shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Semua ({monthCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterScope === 'week'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Minggu Ini ({weekCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterScope === 'today'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-300 hover:text-white'
              }`}
            >
              <span>Hari Ini ({todayCount})</span>
              {todayCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />}
            </button>
          </div>
        </div>

        {/* Members Cards List */}
        <div className="relative z-10 mt-4 space-y-3">
          {displayList.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-black/25 border border-emerald-500/20 text-stone-300 text-xs space-y-2">
              <Cake className="w-8 h-8 text-stone-500 mx-auto mb-2" />
              <p className="font-semibold text-stone-200">
                Tidak ada member yang berulang tahun dalam filter ini.
              </p>
              <p className="text-stone-400 text-[11px]">
                Sistem otomatis memantau field tanggal lahir member dan akan memberikan alert saat ulang tahun mendekati.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayList.map((info) => {
                const tier = tiers.find((t) => t.id === info.member.tierId) || tiers[0];
                return (
                  <div
                    key={info.member.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      info.isToday
                        ? 'bg-gradient-to-br from-amber-950/80 via-stone-900 to-emerald-950 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50'
                        : info.isThisWeek
                        ? 'bg-stone-900/90 border-emerald-500/50 hover:border-emerald-400'
                        : 'bg-black/35 border-stone-700/60 hover:border-stone-500'
                    }`}
                  >
                    <div>
                      {/* Top Tag & Countdown */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            info.isToday
                              ? 'bg-amber-400 text-stone-950 font-black animate-pulse'
                              : info.isThisWeek
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          <Cake className="w-3 h-3" />
                          <span>{info.statusLabel}</span>
                        </span>

                        <span className="text-[10px] text-stone-300 font-mono flex items-center gap-1">
                          <span>{info.zodiac.symbol}</span>
                          <span>{info.zodiac.name}</span>
                        </span>
                      </div>

                      {/* Member Info */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-300 font-serif-luxury font-bold flex items-center justify-center shrink-0 border border-emerald-500/40 text-base">
                          {info.member.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            onClick={() => onSelectMember && onSelectMember(info.member)}
                            className="text-xs sm:text-sm font-bold text-white hover:text-emerald-300 cursor-pointer truncate transition-colors"
                            title={info.member.fullName}
                          >
                            {info.member.fullName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded"
                              style={{
                                backgroundColor: `${tier.colorHex}30`,
                                color: tier.colorHex,
                              }}
                            >
                              {tier.name}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {info.member.membershipNumber}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-300 mt-1.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-300 shrink-0" />
                            <span>
                              {info.formattedBirthday} ({info.birthYear}) · Menuju usia{' '}
                              <strong className="text-amber-300 font-mono">{info.turningAge} Thn</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA Actions */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-emerald-300 font-medium">
                        Bonus: <strong className="text-amber-300">+{pointRules?.birthdayBonusPoints || 300} Pts</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenOfferModal(info)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          info.isToday
                            ? 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-stone-950 shadow-md font-black'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>Kirim Penawaran Spesial</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE BIRTHDAY SPECIAL OFFER MODAL */}
      {/* ========================================================================= */}
      {selectedBirthdayMember && offerDetails && (
        <Modal
          isOpen={Boolean(selectedBirthdayMember)}
          onClose={() => setSelectedBirthdayMember(null)}
          title={`Penawaran Spesial Ulang Tahun: ${selectedBirthdayMember.member.fullName}`}
          subtitle={`Member ${selectedBirthdayMember.member.membershipNumber} · Ulang Tahun: ${selectedBirthdayMember.formattedBirthday} (Usia ke-${selectedBirthdayMember.turningAge})`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-stone-800">
            {/* Top Celebratory Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#072417] via-[#0d3b25] to-stone-900 text-white flex items-center justify-between gap-4 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xl border border-amber-400/40">
                  🎂
                </div>
                <div>
                  <div className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">
                    Spesial Hari Bahagia Tamu VIP
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-serif-luxury">
                    Ulang Tahun ke-{selectedBirthdayMember.turningAge} — {selectedBirthdayMember.formattedBirthday}
                  </h3>
                  <p className="text-[11px] text-stone-300">
                    Zodiak: {selectedBirthdayMember.zodiac.symbol} {selectedBirthdayMember.zodiac.name} · Kontak: {selectedBirthdayMember.member.phone}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950 font-mono">
                  {selectedBirthdayMember.statusLabel}
                </span>
              </div>
            </div>

            {/* 4 Multi-Channel Special Offer Actions */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-700" />
                <span>Pilih Penawaran & Hadiah Spesial untuk Tamu:</span>
              </h4>

              {/* Action 1: Instant Birthday Voucher Generation */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-50/80 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <Ticket className="w-4 h-4 text-amber-600" />
                    <span>1. Terbitkan Voucher Diskon Ultah ({offerDetails.voucherDiscountPercent}% F&B & Kamar)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleIssueBirthdayVoucher}
                    disabled={isGeneratingVoucher || voucherCreatedSuccess}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      voucherCreatedSuccess
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    {voucherCreatedSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Voucher Telah Diterbitkan</span>
                      </>
                    ) : isGeneratingVoucher ? (
                      <span>Memproses...</span>
                    ) : (
                      <>
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Klaim ke Dompet Tamu</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-stone-600">
                  Kode Voucher: <strong className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{offerDetails.voucherCode}</strong> · Berlaku 30 hari untuk makan di Restoran Teratai & booking kamar.
                </p>
              </div>

              {/* Action 2: Loyalty Bonus Points (+300 Pts) */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-50/80 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>2. Kreditkan Poin Loyalitas Ulang Tahun (+{offerDetails.pointsBonus} Pts)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGrantBonusPoints}
                    disabled={isAddingBonusPoints || pointsGrantedSuccess}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      pointsGrantedSuccess
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {pointsGrantedSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>+{offerDetails.pointsBonus} Poin Masuk</span>
                      </>
                    ) : isAddingBonusPoints ? (
                      <span>Menambahkan...</span>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        <span>Tambah Poin Bonus</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-stone-600">
                  Otomatis dicatat di riwayat buku besar poin member dengan kategori <em>birthday bonus</em>.
                </p>
              </div>

              {/* Action 3: Send WhatsApp Greeting via ping.co.id */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <MessageSquare className="w-4 h-4 text-[#00A651]" />
                    <span>3. Kirim Ucapan & Penawaran via WhatsApp (ping.co.id)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendWhatsAppOffer}
                    disabled={isSendingWa || waSentSuccess}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      waSentSuccess
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-[#00A651] hover:bg-[#008f45] text-white'
                    }`}
                  >
                    {waSentSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>WhatsApp Terkirim</span>
                      </>
                    ) : isSendingWa ? (
                      <span>Mengirim...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Pesan WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={offerDetails.whatsappMessage}
                    onChange={(e) =>
                      setOfferDetails({ ...offerDetails, whatsappMessage: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-[11px] font-mono text-stone-800 leading-relaxed focus:outline-emerald-600"
                  />
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    Tujuan: <strong>{selectedBirthdayMember.member.phone}</strong> (Pesan dapat disesuaikan sebelum dikirim)
                  </div>
                </div>
              </div>

              {/* Action 4: Send Official Email Greeting */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <Mail className="w-4 h-4 text-emerald-800" />
                    <span>4. Kirim Email Ucapan Resmi Hotel</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendEmailOffer}
                    disabled={isSendingEmail || emailSentSuccess}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      emailSentSuccess
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-emerald-900 hover:bg-emerald-950 text-white'
                    }`}
                  >
                    {emailSentSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Email Terkirim</span>
                      </>
                    ) : isSendingEmail ? (
                      <span>Mengirim...</span>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Kirim Email</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-stone-600 bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-400">Subjek:</span> <strong>{offerDetails.emailSubject}</strong><br />
                  <span className="text-stone-400">Tujuan:</span> <strong>{selectedBirthdayMember.member.email}</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Pelayanan hospitality personal meningkatkan loyalitas dan kunjungan ulang tamu.</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBirthdayMember(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
