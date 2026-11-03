import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
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
  AlertCircle,
  Keyboard,
  Sparkles,
} from 'lucide-react';

interface UniversalBarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
  title?: string;
  placeholder?: string;
  autoStartCamera?: boolean;
  className?: string;
}

// Check for native BarcodeDetector API in modern browsers
declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

export const UniversalBarcodeScanner: React.FC<UniversalBarcodeScannerProps> = ({
  onScan,
  onClose,
  title = 'Pindai Barcode / QR Code',
  placeholder = 'Arahkan kamera ke QR Code atau Barcode...',
  autoStartCamera = true,
  className = '',
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const barcodeDetectorRef = useRef<any>(null);

  // Initialize native BarcodeDetector if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: [
            'qr_code',
            'code_128',
            'code_39',
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'data_matrix',
            'itf',
            'codabar',
          ],
        });
      } catch (e) {
        console.warn('BarcodeDetector initialization fallback:', e);
      }
    }
  }, []);

  // Concierge chime via Web Audio API
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6 chime

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } catch {}
  }, [soundEnabled]);

  const handleValidDetection = useCallback((raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    // Prevent multi-trigger within 1.5 seconds
    const now = Date.now();
    if (clean === lastScanned && now - lastScanTimestamp.current < 1500) {
      return;
    }

    lastScanTimestamp.current = now;
    setLastScanned(clean);
    setIsSuccessFlash(true);
    playBeep();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {}
    }

    setTimeout(() => setIsSuccessFlash(false), 600);
    onScan(clean);
  }, [lastScanned, onScan, playBeep]);

  // Global listener for USB / Bluetooth physical Barcode Scanner Guns
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
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

      // Barcode scanner guns type characters rapidly (typically < 45ms between chars)
      if (diff > 80) {
        keyBuffer = '';
      }

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 3) {
          e.preventDefault();
          handleValidDetection(keyBuffer);
          keyBuffer = '';
        }
      } else if (e.key.length === 1) {
        keyBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleValidDetection]);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  }, []);

  // Frame processing loop
  const processFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;

    // 1. Try native BarcodeDetector first (handles both 1D Barcode and 2D QR Code)
    if (barcodeDetectorRef.current) {
      try {
        const barcodes = await barcodeDetectorRef.current.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          handleValidDetection(barcodes[0].rawValue);
          // Continue scanning loop
        }
      } catch (err) {
        // Fall back to canvas jsQR
      }
    }

    // 2. Fallback to jsQR
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w > 0 && h > 0) {
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const qr = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
        if (qr && qr.data) {
          handleValidDetection(qr.data);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [handleValidDetection]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState('requesting');
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported');
      setCameraError('Browser ini tidak mendukung API akses kamera web.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraState('active');
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.name : String(err);
      if (errMsg === 'NotAllowedError' || errMsg === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraError('Izin akses kamera ditolak oleh browser.');
      } else {
        setCameraState('error');
        setCameraError('Kamera tidak dapat diaktifkan atau sedang digunakan aplikasi lain.');
      }
    }
  }, [facingMode, processFrame, stopCamera]);

  useEffect(() => {
    if (scanMode === 'camera' && autoStartCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanMode, autoStartCamera, startCamera, stopCamera]);

  // File Upload Decoder
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // Try native detector first
        if (barcodeDetectorRef.current) {
          try {
            const detected = await barcodeDetectorRef.current.detect(img);
            if (detected && detected.length > 0 && detected[0].rawValue) {
              handleValidDetection(detected[0].rawValue);
              return;
            }
          } catch {}
        }

        // Fallback jsQR
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, img.width, img.height);
          const qr = jsQR(data.data, data.width, data.height);
          if (qr && qr.data) {
            handleValidDetection(qr.data);
            return;
          }
        }
        alert('Tidak ditemukan QR Code atau Barcode yang terbaca pada gambar ini.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScanMode('camera')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'camera'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kamera Live</span>
          </button>
          <button
            type="button"
            onClick={() => setScanMode('upload')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'upload'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Unggah Gambar</span>
          </button>
          <button
            type="button"
            onClick={() => setScanMode('manual')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'manual'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ketik Kode / Scanner Gun</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
          title={soundEnabled ? 'Bunyi Chime Aktif' : 'Bunyi Dimatikan'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Mode 1: Camera View */}
      {scanMode === 'camera' && (
        <div className="relative rounded-2xl overflow-hidden bg-stone-950 aspect-4/3 max-h-[300px] border border-stone-800 shadow-inner flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Success Flash Animation */}
          {isSuccessFlash && (
            <div className="absolute inset-0 bg-emerald-500/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30 animate-in fade-in duration-150">
              <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
              <span className="text-xs font-bold tracking-wider uppercase mt-1">
                Kode Terdeteksi!
              </span>
            </div>
          )}

          {/* Scanner Reticle Overlay */}
          {cameraState === 'active' && !isSuccessFlash && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-56 h-40 sm:w-64 sm:h-44 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(4,22,14,0.65)]">
                {/* Gold Reticle Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#C5A869] -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#C5A869] -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#C5A869] -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#C5A869] -mb-1 -mr-1 rounded-br-lg" />

                {/* Laser animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10B981] animate-bounce top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] font-semibold text-emerald-300 mt-4 px-3 py-1 bg-stone-900/90 rounded-full border border-emerald-500/30 shadow-xs">
                {placeholder}
              </p>
            </div>
          )}

          {/* Camera States (Requesting, Denied, Error) */}
          {cameraState === 'requesting' && (
            <div className="absolute inset-0 bg-stone-950/90 text-white flex flex-col items-center justify-center p-4 text-center">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mb-2" />
              <span className="text-xs font-semibold">Menghubungkan Kamera...</span>
            </div>
          )}

          {cameraState === 'denied' && (
            <div className="absolute inset-0 bg-stone-950/95 text-white flex flex-col items-center justify-center p-6 text-center">
              <CameraOff className="w-8 h-8 text-rose-400 mb-2" />
              <span className="text-xs font-bold text-rose-300">Izin Kamera Ditolak</span>
              <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
                Klik ikon gembok di URL browser untuk mengizinkan akses kamera, lalu muat ulang.
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-3 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {cameraState === 'error' && (
            <div className="absolute inset-0 bg-stone-950/95 text-white flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <span className="text-xs font-bold text-amber-300">Kamera Tidak Tersedia</span>
              <p className="text-[11px] text-stone-400 mt-1 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={() => setScanMode('manual')}
                className="mt-3 px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold"
              >
                Gunakan Input Manual
              </button>
            </div>
          )}
        </div>
      )}

      {/* Camera Controls Footer */}
      {scanMode === 'camera' && cameraState === 'active' && (
        <div className="flex items-center justify-between text-xs text-stone-600 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-stone-700 font-medium">Scanner Kamera Aktif</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
              }}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <SwitchCamera className="w-3 h-3 text-emerald-700" />
              <span>Ganti ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg cursor-pointer transition-colors"
              title="Refresh Kamera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Upload Image */}
      {scanMode === 'upload' && (
        <div className="p-6 border-2 border-dashed border-emerald-500/40 rounded-2xl bg-stone-50 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-800">Unggah Foto Kartu / Voucher</h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Pilih foto kartu member fisik atau screenshot voucher digital tamu.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
            <QrCode className="w-4 h-4" />
            <span>Pilih Berkas Foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Mode 3: Manual Input & Scanner Gun info */}
      {scanMode === 'manual' && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Scanner Gun USB/Bluetooth:</strong> Anda bisa langsung menembakkan scanner barcode fisik kapan saja tanpa perlu klik kolom input!
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) {
                handleValidDetection(manualCode.trim());
                setManualCode('');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik Nomor Member (LGH-...) atau Kode Voucher..."
              className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600"
              autoFocus
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Proses
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
