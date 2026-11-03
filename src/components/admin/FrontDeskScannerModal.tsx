import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Member, MembershipTier, Voucher, VoucherRedemption } from '../../types';
import { Modal } from '../common/Modal';
import { LombokGardenLogo } from '../common/LombokGardenLogo';
import { formatDateIndo, formatIDR } from '../../services/membershipEngine';
import jsQR from 'jsqr';
import {
  Search,
  CheckCircle,
  AlertCircle,
  BedDouble,
  Receipt,
  Coins,
  UserCheck,
  Sparkles,
  Camera,
  CameraOff,
  RefreshCw,
  Upload,
  SwitchCamera,
  Volume2,
  VolumeX,
  QrCode,
  ScanLine,
  CheckCircle2,
  ShieldCheck,
  Zap,
  MapPin,
  Flame,
  ArrowRight,
  Ticket,
  UtensilsCrossed,
  Flower2,
  Building2,
  Tag,
} from 'lucide-react';

interface FrontDeskScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionCheckIn: (member: Member) => void;
  onActionAddTransaction: (member: Member) => void;
  onActionAdjustPoints: (member: Member) => void;
  onActionViewProfile: (member: Member) => void;
  onOpenAddMember?: () => void;
  onOpenVoucherScanner?: (member?: Member) => void;
}

export const FrontDeskScannerModal: React.FC<FrontDeskScannerModalProps> = ({
  isOpen,
  onClose,
  onActionCheckIn,
  onActionAddTransaction,
  onActionAdjustPoints,
  onActionViewProfile,
  onOpenAddMember,
  onOpenVoucherScanner,
}) => {
  const { members, tiers, vouchers } = useApp();
  const { showToast } = useToast();

  // Mode: 'camera' | 'upload' | 'manual'
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [lastScannedRaw, setLastScannedRaw] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // Camera state
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error'>('idle');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const barcodeDetectorRef = useRef<any>(null);

  // Initialize native BarcodeDetector for 1D Barcodes (Code128, Code39, EAN) & QR
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'qr_code',
            'data_matrix',
            'itf',
            'codabar',
          ],
        });
      } catch (e) {
        console.warn('Native BarcodeDetector initialization notice, falling back to jsQR:', e);
      }
    }
  }, []);

  // Harmonious Multi-Tone Luxury Concierge Chime via Web Audio API
  const playSuccessChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Major chord ascent: C5 -> E5 -> G5 -> C6
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = ctx.currentTime + idx * 0.055;
        const noteDuration = 0.38 - idx * 0.04;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);
      });
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, [soundEnabled]);

  // Error buzz sound
  const playErrorBuzz = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  // Match scanned text to a member in memory
  const handleDecodedData = useCallback((decoded: string) => {
    const clean = decoded.trim();
    if (!clean) return;

    // Throttle duplicate scan within 2 seconds
    const now = Date.now();
    if (lastScannedRaw === clean && now - lastDetectionTimeRef.current < 2000) {
      return;
    }
    lastDetectionTimeRef.current = now;
    setLastScannedRaw(clean);
    setScanError(null);

    // Try parsing if payload is JSON
    let searchKey = clean;
    try {
      if (clean.startsWith('{') && clean.endsWith('}')) {
        const parsed = JSON.parse(clean);
        searchKey = parsed.membershipNumber || parsed.id || parsed.email || clean;
      }
    } catch {
      // Not json
    }

    // Extract code if clean is a URL like https://member.lombokgardenhotel.com/card/LGH-1234
    if (searchKey.includes('/')) {
      const parts = searchKey.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length >= 3) {
        searchKey = lastPart;
      }
    }

    const keyLower = searchKey.toLowerCase();
    const found = members.find(
      (m) =>
        m.membershipNumber.toLowerCase() === keyLower ||
        m.id.toLowerCase() === keyLower ||
        (m.referralCode && m.referralCode.toLowerCase() === keyLower) ||
        m.email.toLowerCase() === keyLower ||
        m.phone.replace(/[^0-9]/g, '') === keyLower.replace(/[^0-9]/g, '') ||
        (m.idCardNumber && m.idCardNumber === keyLower) ||
        m.fullName.toLowerCase().includes(keyLower)
    );

    if (found) {
      // Trigger camera flash animation & audio chime
      setIsFlashing(true);
      playSuccessChime();

      // Trigger light haptic feedback on mobile devices
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([40, 50, 60]);
        } catch {}
      }

      setTimeout(() => setIsFlashing(false), 850);
      setSelectedMember(found);
      setSearchQuery('');
      showToast(`Member Terverifikasi: ${found.fullName} (${found.membershipNumber})`, 'success');
    } else {
      playErrorBuzz();
      // Check if this looks like a voucher code
      const isVoucherLike =
        vouchers.some((v) => v.code.toLowerCase() === keyLower || v.id.toLowerCase() === keyLower) ||
        clean.toUpperCase().startsWith('VCH-') ||
        clean.toUpperCase().startsWith('PROMO-') ||
        clean.toUpperCase().startsWith('REW-') ||
        clean.startsWith('vrdm_') ||
        clean.startsWith('rew_');

      if (isVoucherLike) {
        showToast(`Kode "${clean}" terdeteksi sebagai Barcode Voucher. Buka menu Redeem Voucher untuk memproses.`, 'info');
        setScanError(`Kode "${clean}" adalah Barcode Voucher. Gunakan tombol "Redeem Voucher" di bawah untuk memproses kupon ini.`);
      } else {
        showToast(`Barcode / QR "${clean}" tidak ditemukan di database member hotel.`, 'error');
        setScanError(`Kode "${clean}" terdeteksi, namun tidak cocok dengan nomor kartu atau ID member terdaftar.`);
      }
    }
  }, [members, vouchers, lastScannedRaw, playSuccessChime, playErrorBuzz, showToast]);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Frame processing loop with native BarcodeDetector for 1D barcodes and jsQR fallback
  const scanVideoFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);

        // 1. First attempt: Native BarcodeDetector (reads 1D Barcodes: Code 128, Code 39, EAN-13, EAN-8, etc.)
        if (barcodeDetectorRef.current) {
          barcodeDetectorRef.current
            .detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDecodedData(barcodes[0].rawValue);
              } else {
                // Fallback to jsQR for 2D QR codes
                const imageData = ctx.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'attemptBoth',
                });
                if (code && code.data) {
                  handleDecodedData(code.data);
                }
              }
            })
            .catch(() => {
              // Fallback to jsQR
              const imageData = ctx.getImageData(0, 0, width, height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
              });
              if (code && code.data) {
                handleDecodedData(code.data);
              }
            });
        } else {
          // Fallback if BarcodeDetector unsupported
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            handleDecodedData(code.data);
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleDecodedData]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported');
      setCameraErrorMessage('Browser atau perangkat ini tidak mendukung akses kamera langsung.');
      return;
    }

    setCameraState('requesting');
    setCameraErrorMessage(null);

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraState('active');

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      } catch {
        // ignore device listing error
      }

      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
    } catch (err: unknown) {
      const errObj = err as Error;
      console.warn('Camera Access Notice:', errObj?.name, errObj?.message);
      if (errObj?.name === 'NotAllowedError' || errObj?.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraErrorMessage('Izin akses kamera tidak diberikan. Silakan izinkan akses kamera di pengaturan browser Anda.');
      } else if (errObj?.name === 'NotFoundError' || errObj?.name === 'DevicesNotFoundError') {
        setCameraState('error');
        setCameraErrorMessage('Tidak ada modul kamera yang terdeteksi pada perangkat ini.');
      } else {
        setCameraState('error');
        setCameraErrorMessage(errObj?.message || 'Gagal memulai pemindaian kamera.');
      }
    }
  }, [facingMode, selectedDeviceId, scanVideoFrame, stopCamera]);

  // Lifecycle
  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode, startCamera, stopCamera]);

  // Initial selection
  useEffect(() => {
    if (isOpen && !selectedMember && members.length > 0) {
      setSelectedMember(members[0]);
    }
  }, [isOpen, members, selectedMember]);

  // Toggle Camera Facing
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setSelectedDeviceId('');
  };

  // Global listener for USB / Bluetooth physical Barcode Scanner Guns
  useEffect(() => {
    if (!isOpen) return;

    let keyBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in manual search box
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        target.id !== 'scanner-gun-receiver'
      ) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Barcode guns send fast keystrokes ending with Enter
      if (e.key === 'Enter') {
        if (keyBuffer.trim().length >= 3) {
          handleDecodedData(keyBuffer.trim());
          keyBuffer = '';
        }
        return;
      }

      // Reset buffer if delay > 120ms (manual typing vs scanner gun)
      if (diff > 120) {
        keyBuffer = '';
      }

      if (e.key.length === 1) {
        keyBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleDecodedData]);

  // Image Upload Scanner (Supporting 1D Barcode and QR)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);

          // Try BarcodeDetector first
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(canvas);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDecodedData(barcodes[0].rawValue);
                return;
              }
            } catch (err) {
              console.warn('Image BarcodeDetector notice:', err);
            }
          }

          // Fallback to jsQR
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleDecodedData(code.data);
          } else {
            playErrorBuzz();
            showToast('Tidak dapat mendeteksi kode QR atau barcode pada gambar yang diunggah.', 'error');
            setScanError('Tidak dapat mendeteksi kode QR atau barcode pada gambar yang diunggah. Pastikan foto kartu jelas dan terang.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const currentTier: MembershipTier = selectedMember
    ? tiers.find((t) => t.id === selectedMember.tierId) || tiers[0]
    : tiers[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="2xl"
    >
      <div className="space-y-4 -mt-3">
        {/* Lombok Garden Hotel Branded Modal Header */}
        <div className="bg-gradient-to-r from-[#072417] via-[#0A3320] to-[#072417] p-4 sm:p-5 rounded-2xl text-white relative overflow-hidden shadow-sm border border-[#00A651]/30">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#00A651]/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#C5A869]/15 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-xs border border-[#00A651]/30 shrink-0">
                <LombokGardenLogo variant="horizontal" size="sm" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A869] font-mono">
                    Front Desk Operations
                  </span>
                  <span className="text-emerald-400">&bull;</span>
                  <span className="text-[10px] text-emerald-300 font-semibold">QR Scanner & Verifikasi</span>
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-white tracking-tight leading-tight mt-0.5">
                  Pemindai Kartu Member Digital & Fisik
                </h3>
              </div>
            </div>

            {/* Sound & Scan Options */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-[#00A651]/20 border-[#00A651]/50 text-emerald-300'
                    : 'bg-emerald-950/60 border-emerald-900 text-stone-400'
                }`}
                title={soundEnabled ? 'Suara Chime Berhasil Aktif' : 'Suara Nonaktif'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00A651]" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{soundEnabled ? 'Chime ON' : 'Mute'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Kamera Langsung, Upload Foto Kartu, Cari Manual) */}
        <div className="flex items-center justify-between border-b border-[#E5DFD3] pb-2.5">
          <div className="flex items-center gap-1.5 p-1 bg-[#F4F1EA] rounded-xl border border-[#E5DFD3]">
            <button
              type="button"
              onClick={() => setScanMode('camera')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                scanMode === 'camera'
                  ? 'bg-[#072417] text-white shadow-xs border border-[#00A651]/40'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#00A651]" />
              <span>Kamera Langsung</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                scanMode === 'upload'
                  ? 'bg-[#072417] text-white shadow-xs border border-[#00A651]/40'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#00A651]" />
              <span>Unggah Gambar Kartu</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('manual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                scanMode === 'manual'
                  ? 'bg-[#072417] text-white shadow-xs border border-[#00A651]/40'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-[#00A651]" />
              <span>Cari Manual</span>
            </button>
          </div>

          <div className="text-[11px] text-stone-500 font-mono hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
            <span>Resort Scanner Ready</span>
          </div>
        </div>

        {/* ================= VIEW 1: LIVE CAMERA SCANNER WITH FLASH ANIMATION ================= */}
        {scanMode === 'camera' && (
          <div className="space-y-3">
            <div className="relative w-full aspect-video sm:aspect-[16/9] max-h-[300px] bg-[#04160E] rounded-2xl overflow-hidden border-2 border-[#00A651]/50 flex items-center justify-center shadow-lg">
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* SUCCESS CAMERA FLASH ANIMATION OVERLAY */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-30 flex flex-col items-center justify-center transition-all duration-700 pointer-events-none animate-in fade-in">
                  <div className="p-4 bg-[#072417] text-white rounded-2xl shadow-2xl border-2 border-[#00A651] flex items-center gap-3 animate-in zoom-in-75 duration-200">
                    <div className="w-10 h-10 rounded-xl bg-[#00A651] text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[#C5A869] font-bold uppercase tracking-widest font-mono">
                        Kartu Berhasil Terpindai!
                      </div>
                      <div className="text-sm font-bold text-white font-serif">
                        {selectedMember?.fullName}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Scanner Viewport Overlay */}
              {cameraState === 'active' && !isFlashing && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Bounding Box Frame */}
                  <div className="w-60 h-44 sm:w-72 sm:h-52 border-2 border-[#00A651] rounded-2xl relative shadow-[0_0_0_9999px_rgba(4,22,14,0.55)]">
                    {/* Corner Reticles (Champagne Gold Accents) */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#C5A869] -mt-1 -ml-1 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#C5A869] -mt-1 -mr-1 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#C5A869] -mb-1 -ml-1 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#C5A869] -mb-1 -mr-1 rounded-br-lg" />

                    {/* Animated Laser Scanning Line */}
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#00A651] to-transparent shadow-[0_0_14px_#00A651] animate-bounce duration-1000 top-1/2 -translate-y-1/2" />

                    <div className="absolute -bottom-7 left-0 right-0 text-center">
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-[#072417]/90 text-emerald-300 px-3 py-1 rounded-full border border-[#00A651]/40 shadow-xs">
                        Posisikan QR atau Barcode Tamu di Kotak
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera State Overlays */}
              {cameraState === 'requesting' && (
                <div className="absolute inset-0 bg-[#072417]/95 text-white flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <RefreshCw className="w-8 h-8 text-[#00A651] animate-spin" />
                  <div className="font-bold text-sm">Menghubungkan ke Kamera...</div>
                  <p className="text-xs text-emerald-200/80 max-w-xs">
                    Harap izinkan akses kamera pada prompt browser Anda untuk mulai memindai.
                  </p>
                </div>
              )}

              {cameraState === 'denied' && (
                <div className="absolute inset-0 bg-[#072417]/95 text-white flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-sm text-rose-300">Akses Kamera Ditolak</div>
                  <p className="text-xs text-stone-300 max-w-sm">
                    {cameraErrorMessage || 'Izin kamera diblokir oleh browser. Klik ikon gembok / kamera di bilah alamat browser Anda dan pilih "Izinkan", lalu coba lagi.'}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-2 px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Akses Kamera Lagi</span>
                  </button>
                </div>
              )}

              {(cameraState === 'error' || cameraState === 'unsupported') && (
                <div className="absolute inset-0 bg-[#072417]/95 text-white flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#C5A869]/20 text-[#C5A869] flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-sm text-amber-300">Kamera Tidak Terdeteksi</div>
                  <p className="text-xs text-stone-300 max-w-sm">
                    {cameraErrorMessage || 'Kamera tidak dapat diakses pada perangkat ini. Anda dapat menggunakan opsi Unggah Foto Kartu atau Pencarian Manual.'}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setScanMode('upload')}
                      className="px-3.5 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto Kartu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('manual')}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Input Manual</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls Bar */}
            {cameraState === 'active' && (
              <div className="flex items-center justify-between text-xs text-stone-600 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
                  <span className="font-medium text-stone-700">Kamera Aktif & Memindai Real-Time</span>
                </div>

                <div className="flex items-center gap-2">
                  {availableDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                      }}
                      className="text-xs px-2.5 py-1 bg-[#F4F1EA] border border-[#E5DFD3] rounded-lg text-stone-800 font-medium"
                    >
                      <option value="">Pilih Kamera</option>
                      {availableDevices.map((dev, idx) => (
                        <option key={dev.deviceId} value={dev.deviceId}>
                          {dev.label || `Kamera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="px-2.5 py-1 bg-[#F4F1EA] hover:bg-[#EAE5D9] text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-[#E5DFD3]"
                    title="Ganti Kamera Depan / Belakang"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#00A651]" />
                    <span>Ganti ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="p-1.5 bg-[#F4F1EA] hover:bg-[#EAE5D9] text-stone-700 rounded-lg border border-[#E5DFD3] cursor-pointer"
                    title="Muat Ulang Kamera"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 2: UPLOAD IMAGE SCANNER ================= */}
        {scanMode === 'upload' && (
          <div className="p-6 border-2 border-dashed border-[#00A651]/40 rounded-2xl bg-[#F8F6F0] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00A651] flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 font-serif">Unggah Foto Kartu Member atau QR</h4>
              <p className="text-xs text-stone-500 mt-0.5 max-w-sm mx-auto">
                Pilih berkas foto kartu fisik atau tangkapan layar kartu digital tamu dari perangkat Anda.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all">
              <QrCode className="w-4 h-4" />
              <span>Pilih Berkas Gambar (PNG / JPG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* ================= VIEW 3: MANUAL SEARCH ================= */}
        {scanMode === 'manual' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik Nomor Member (LGH-...), Nama Tamu, atau No. Telepon..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F6F0] border border-[#E5DFD3] rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#00A651]/30 focus:border-[#00A651]"
                autoFocus
              />
            </div>

            {/* Quick Member Selection Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-stone-400 shrink-0 font-medium text-[11px]">
                Daftar Tamu Cepat:
              </span>
              {members.slice(0, 8).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMember(m);
                    setScanError(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer ${
                    selectedMember?.id === m.id
                      ? 'bg-[#072417] text-[#C5A869] font-semibold shadow-xs border border-[#00A651]/40'
                      : 'bg-[#F4F1EA] hover:bg-[#EAE5D9] text-stone-700 border border-[#E5DFD3]'
                  }`}
                >
                  {m.fullName.split(' ')[0]} ({m.membershipNumber})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notification Error if scanned code doesn't match */}
        {scanError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Kode Belum Terdaftar di Sistem</div>
                <div className="text-stone-600 mt-0.5">{scanError}</div>
              </div>
            </div>
            {onOpenAddMember && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddMember();
                }}
                className="px-3 py-1.5 bg-[#00A651] text-white rounded-lg text-xs font-bold shrink-0 hover:bg-[#008f45] cursor-pointer shadow-xs"
              >
                + Daftarkan Member
              </button>
            )}
          </div>
        )}

        {/* ================= VERIFICATION RESULT CARD (OFFICIAL BRAND THEME) ================= */}
        {selectedMember ? (
          <div className="bg-[#FAF9F5] rounded-2xl border border-[#E5DFD3] p-4 sm:p-5 space-y-4 shadow-xs relative overflow-hidden">
            {/* Top Accent Stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-[#00A651] via-[#C5A869] to-[#072417] absolute top-0 left-0 right-0" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-[#E5DFD3] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#072417] to-[#0A3320] text-[#C5A869] font-serif font-bold text-lg flex items-center justify-center shadow-xs border border-[#00A651]/40 shrink-0">
                  {selectedMember.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-stone-900 font-serif">
                      {selectedMember.fullName}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        selectedMember.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedMember.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-stone-500 mt-0.5 flex items-center gap-2">
                    <span className="text-[#072417] font-bold bg-[#00A651]/15 px-1.5 py-0.5 rounded text-emerald-900">
                      {selectedMember.membershipNumber}
                    </span>
                    <span>&bull;</span>
                    <span>{selectedMember.phone}</span>
                  </div>
                </div>
              </div>

              {/* Tier Badge */}
              <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-[#E5DFD3] shadow-xs">
                <Sparkles className="w-4 h-4 text-[#C5A869]" />
                <div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                    Tier Membership
                  </div>
                  <div className="text-xs font-bold text-stone-900 font-serif">
                    {currentTier.name} (Lvl {currentTier.level})
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white rounded-xl border border-[#E5DFD3]">
                <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                  Poin Tersedia
                </div>
                <div className="text-sm font-bold text-[#00A651] font-mono mt-0.5">
                  {selectedMember.availablePoints.toLocaleString('id-ID')} pts
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E5DFD3]">
                <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                  Total Spending
                </div>
                <div className="text-sm font-bold text-stone-900 font-mono mt-0.5">
                  Rp {(selectedMember.totalSpending / 1000000).toFixed(1)} Jt
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E5DFD3]">
                <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                  Total Kunjungan
                </div>
                <div className="text-sm font-bold text-stone-900 font-mono mt-0.5">
                  {selectedMember.totalVisits}x Menginap
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E5DFD3]">
                <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                  Masa Berlaku
                </div>
                <div className="text-[11px] font-semibold text-stone-700 font-mono mt-0.5">
                  {formatDateIndo(selectedMember.membershipEndDate)}
                </div>
              </div>
            </div>

            {/* Active Tier Benefits preview for Front Office Staff */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E5DFD3]">
              <div className="text-[11px] font-semibold text-stone-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#00A651]" />
                Benefit Aktif Tamu:
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-stone-600">
                {currentTier.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00A651] shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Staff Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onActionCheckIn(selectedMember);
                  onClose();
                }}
                className="py-2.5 px-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <BedDouble className="w-3.5 h-3.5" />
                <span>Check-In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onActionAddTransaction(selectedMember);
                  onClose();
                }}
                className="py-2.5 px-3 bg-[#072417] hover:bg-[#0c3522] text-stone-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>Catat Belanja</span>
              </button>

              {onOpenVoucherScanner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVoucherScanner(selectedMember);
                  }}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Redeem Voucher</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onActionAdjustPoints(selectedMember);
                  onClose();
                }}
                className="py-2.5 px-3 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 text-[#C5A869]" />
                <span>Poin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onActionViewProfile(selectedMember);
                  onClose();
                }}
                className="py-2.5 px-3 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-stone-500" />
                <span>Profil</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-[#F8F6F0] rounded-2xl border border-[#E5DFD3] text-stone-500 text-xs">
            Arahkan kamera ke kartu member atau cari member di atas untuk verifikasi kartu
          </div>
        )}
      </div>
    </Modal>
  );
};
