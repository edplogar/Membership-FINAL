/**
 * Image processing service for local device uploads.
 * Compresses and formats user-selected image files from local devices
 * into lightweight, high-quality base64 Data URLs suitable for instant local preview
 * and reliable persistent storage.
 */

export interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export async function processLocalImageFile(
  file: File,
  options: ProcessImageOptions = {}
): Promise<{ dataUrl: string; sizeKb: number; fileName: string }> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.85,
    format = 'image/jpeg',
  } = options;

  if (!file) {
    throw new Error('Tidak ada file yang dipilih.');
  }

  // Validate mime type
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berformat gambar (JPG, PNG, WebP, GIF).');
  }

  // Max 10MB raw input check to prevent browser freeze
  const maxRawBytes = 10 * 1024 * 1024;
  if (file.size > maxRawBytes) {
    throw new Error('Ukuran file terlalu besar. Maksimal 10 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Square cropping / scaling for avatars:
          // Crop center square first to ensure nice circle avatars
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          // Target output dimensions
          const targetDim = Math.min(maxWidth, minDim);
          canvas.width = targetDim;
          canvas.height = targetDim;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: e.target?.result as string,
              sizeKb: Math.round(file.size / 1024),
              fileName: file.name,
            });
            return;
          }

          // Image smoothing for high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw cropped centered square
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            targetDim,
            targetDim
          );

          const compressedDataUrl = canvas.toDataURL(format, quality);
          // Calculate approx size in KB
          const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);
          const sizeKb = Math.round(approxBytes / 1024);

          resolve({
            dataUrl: compressedDataUrl,
            sizeKb,
            fileName: file.name,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Gagal memproses gambar. Format file mungkin rusak.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file dari perangkat lokal Anda.'));
    };

    reader.readAsDataURL(file);
  });
}
