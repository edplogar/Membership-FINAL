import React, { useState } from 'react';
import { Member, MembershipTier } from '../../types';
import { Modal } from './Modal';
import { DigitalMembershipCard } from '../member/DigitalMembershipCard';
import { downloadMemberCardImage } from '../../services/cardDownloadService';
import { useToast } from '../../context/ToastContext';
import { MEMBER_CUSTOM_DOMAIN } from '../../services/domainService';
import {
  Download,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Mail,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface MemberCardSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  tier: MembershipTier | null;
  onContinue?: () => void;
  continueButtonText?: string;
  title?: string;
}

export const MemberCardSuccessModal: React.FC<MemberCardSuccessModalProps> = ({
  isOpen,
  onClose,
  member,
  tier,
  onContinue,
  continueButtonText = 'Masuk ke Portal Member',
  title = 'Kartu Membership Digital Resmi Berhasil Diterbitkan! 🎉',
}) => {
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!member || !tier) return null;

  const portalLoginUrl = `https://${MEMBER_CUSTOM_DOMAIN}`;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const ok = await downloadMemberCardImage(member, tier);
      if (ok) {
        showToast('Kartu membership digital berhasil diunduh sebagai gambar PNG!', 'success');
      } else {
        showToast('Gagal mengunduh kartu. Silakan coba lagi.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat memproses gambar kartu.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(portalLoginUrl);
      setCopiedLink(true);
      showToast('Tautan login resmi berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Gagal menyalin tautan.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Success Dispatch Alert Banner */}
        <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Pendaftaran Berhasil & Otomatis Terdistribusi</span>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed">
            Selamat datang di <strong>Lombok Garden Hotel Hospitality Club</strong>, <strong className="text-stone-900">{member.fullName}</strong>. Akun dan kartu digital Anda telah aktif secara instan pada sistem cloud hotel.
          </p>

          {/* Delivery Channels Badge Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* WhatsApp notification status */}
            <div className="flex items-center gap-2 p-2.5 bg-white/80 rounded-xl border border-emerald-200 text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[10px] text-stone-500 font-medium">WhatsApp CRM Gateway:</div>
                <div className="font-semibold text-stone-800 text-[11px] truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Terkirim ke {member.phone}</span>
                </div>
              </div>
            </div>

            {/* Email notification status */}
            <div className="flex items-center gap-2 p-2.5 bg-white/80 rounded-xl border border-emerald-200 text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[10px] text-stone-500 font-medium">Email Sambutan & Kartu:</div>
                <div className="font-semibold text-stone-800 text-[11px] truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Terkirim ke {member.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Luxury Member Card Visualization */}
        <div className="flex flex-col items-center">
          <div className="w-full">
            <DigitalMembershipCard member={member} tier={tier} />
          </div>

          <p className="text-[11px] text-stone-500 text-center mt-3 max-w-md">
            Kartu digital ini memuat QR Code scannable resmi untuk verifikasi identitas, check-in kamar, diskon F&B, dan penukaran voucher di seluruh outlet hotel.
          </p>
        </div>

        {/* Portal Login Link Notice */}
        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] text-stone-500 font-semibold uppercase block">
              Tautan Akses Portal Member & Kartu:
            </span>
            <a
              href={portalLoginUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-emerald-800 font-bold hover:underline flex items-center gap-1 mt-0.5"
            >
              <span>{portalLoginUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
            </a>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 rounded-lg border border-stone-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Salin Tautan</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons: Download & Continue */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{isDownloading ? 'Menghasilkan Kartu...' : 'Unduh Kartu Digital (PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onContinue) onContinue();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#00A651] hover:bg-[#008F45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <span>{continueButtonText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
