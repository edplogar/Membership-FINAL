import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  showLogo?: boolean;
}

/**
 * High-precision ISO/IEC 18004 compliant QR Code generator using standard qrcode engine.
 * Generates true, universally scannable QR codes that any barcode scanner gun,
 * webcam, or mobile camera can read instantly.
 */
export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 180,
  className = '',
  showLogo = true,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(value, {
      width: size * 2, // 2x resolution for retina sharpness
      margin: 1,
      color: {
        dark: '#072417', // Lombok Garden Hotel Forest Green
        light: '#FFFFFF',
      },
      errorCorrectionLevel: showLogo ? 'H' : 'M', // High error correction when embedding logo
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setHasError(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate real QR Code:', err);
        if (isMounted) setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, showLogo]);

  if (hasError || !qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-white rounded-xl border border-stone-200 flex items-center justify-center p-2 ${className}`}
      >
        <span className="text-[10px] text-stone-400 font-mono text-center">
          {value || 'Membuat QR...'}
        </span>
      </div>
    );
  }

  const logoSize = Math.max(22, Math.round(size * 0.22));

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center bg-white rounded-xl shadow-xs overflow-hidden select-none ${className}`}
    >
      <img
        src={qrDataUrl}
        alt={`QR Code ${value}`}
        style={{ width: size, height: size }}
        className="block object-contain"
      />

      {/* Optional Central Logo Badge */}
      {showLogo && (
        <div
          style={{ width: logoSize, height: logoSize }}
          className="absolute inset-auto bg-[#072417] text-[#C5A869] rounded-lg border-2 border-white shadow-sm flex items-center justify-center pointer-events-none"
        >
          <span className="font-serif font-bold text-[10px] sm:text-xs tracking-tighter">
            LGH
          </span>
        </div>
      )}
    </div>
  );
};
