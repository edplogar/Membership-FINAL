import React, { useMemo } from 'react';

interface BarcodeViewProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  textColor?: string;
}

// Code 128 Pattern Table (indices 0 to 106)
// Each number string represents alternating widths of bars and spaces (sum of widths = 11, stop = 13)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP)
];

const START_B = 104;
const STOP = 106;

/**
 * Standard Code 128B Barcode generator (pure scalable SVG).
 * Fully readable by all industrial and smartphone barcode scanners.
 */
export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  width = 240,
  height = 54,
  showText = true,
  className = '',
  textColor = '#1C1917',
}) => {
  const { bars, totalModules } = useMemo(() => {
    const text = (value || '').trim();
    if (!text) return { bars: [], totalModules: 0 };

    // Code 128B character sequence
    const codes: number[] = [START_B];
    let checksum = START_B;

    for (let i = 0; i < text.length; i++) {
      const ascii = text.charCodeAt(i);
      const code = ascii >= 32 && ascii <= 126 ? ascii - 32 : 0;
      codes.push(code);
      checksum += code * (i + 1);
    }

    const checkDigit = checksum % 103;
    codes.push(checkDigit);
    codes.push(STOP);

    // Convert codes to bar pattern modules
    const barSegments: { x: number; w: number }[] = [];
    let currentX = 10; // Quiet zone left

    for (const code of codes) {
      const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
      let isBar = true;
      for (let j = 0; j < pattern.length; j++) {
        const moduleWidth = parseInt(pattern[j], 10);
        if (isBar) {
          barSegments.push({ x: currentX, w: moduleWidth });
        }
        currentX += moduleWidth;
        isBar = !isBar;
      }
    }

    currentX += 10; // Quiet zone right
    return { bars: barSegments, totalModules: currentX };
  }, [value]);

  if (!value || totalModules === 0) {
    return null;
  }

  const barHeight = showText ? height - 16 : height;

  return (
    <div className={`inline-flex flex-col items-center bg-white p-2 rounded-xl shadow-xs border border-stone-200 ${className}`}>
      <svg
        viewBox={`0 0 ${totalModules} ${barHeight}`}
        style={{ width, height: barHeight }}
        className="block"
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width={totalModules} height={barHeight} fill="#FFFFFF" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y="0"
            width={bar.w}
            height={barHeight}
            fill="#072417"
          />
        ))}
      </svg>
      {showText && (
        <span
          style={{ color: textColor }}
          className="font-mono text-[11px] font-bold tracking-widest mt-1 text-center select-all uppercase"
        >
          {value}
        </span>
      )}
    </div>
  );
};
