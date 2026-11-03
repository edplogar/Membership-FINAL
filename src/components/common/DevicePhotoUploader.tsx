import React, { useRef, useState } from 'react';
import { processLocalImageFile } from '../../services/imageService';
import {
  Upload,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Link,
  Laptop,
  Image as ImageIcon,
} from 'lucide-react';

interface DevicePhotoUploaderProps {
  currentPhoto?: string;
  onPhotoChange: (newPhotoUrl: string) => void;
  userName?: string;
  label?: string;
}

export const DevicePhotoUploader: React.FC<DevicePhotoUploaderProps> = ({
  currentPhoto,
  onPhotoChange,
  userName = 'User',
  label = 'Foto Profil (Avatar)',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; sizeKb: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');

  // Handle local device file selection
  const handleFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      const result = await processLocalImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        format: 'image/jpeg',
      });

      setFileDetails({
        name: result.fileName,
        sizeKb: result.sizeKb,
      });

      onPhotoChange(result.dataUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memproses file foto dari perangkat';
      setError(message);
    } finally {
      setIsProcessing(false);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    onPhotoChange('');
    setFileDetails(null);
    setError(null);
  };

  const handleApplyUrl = () => {
    if (urlInputValue.trim()) {
      onPhotoChange(urlInputValue.trim());
      setFileDetails(null);
      setError(null);
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-stone-700">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-[#00A651] hover:underline flex items-center gap-1 cursor-pointer"
        >
          {showUrlInput ? (
            <>
              <Laptop className="w-3 h-3" />
              <span>Kembali ke Upload Device</span>
            </>
          ) : (
            <>
              <Link className="w-3 h-3" />
              <span>Gunakan URL Luar (Opsional)</span>
            </>
          )}
        </button>
      </div>

      {showUrlInput ? (
        <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-200 animate-in fade-in duration-150">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3 py-2 bg-[#00A651] text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#009647]"
            >
              Terapkan
            </button>
          </div>
          <p className="text-[10px] text-stone-400">
            Tempel tautan gambar berformat HTTPS untuk menggunakan foto online.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Main Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-4 ${
              isDragOver
                ? 'border-[#00A651] bg-[#00A651]/5 ring-4 ring-[#00A651]/10'
                : 'border-stone-200 hover:border-stone-300 bg-stone-50/60'
            }`}
          >
            {/* Avatar Preview Box */}
            <div className="relative shrink-0 group">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={userName}
                  className="w-18 h-18 rounded-2xl object-cover border-2 border-[#00A651] shadow-md transition-transform group-hover:scale-102"
                />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-800 to-stone-900 border-2 border-stone-300 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                  {userName.charAt(0) || <ImageIcon className="w-8 h-8 text-stone-300" />}
                </div>
              )}

              {/* Quick camera overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                title="Pilih foto dari perangkat lokal"
                className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-[#00A651] hover:bg-[#009647] text-white rounded-full shadow-md cursor-pointer transition-transform hover:scale-110 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Instruction and Action Buttons */}
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 rounded-xl text-xs font-bold shadow-xs hover:bg-stone-50 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-[#00A651]" />
                  <span>{isProcessing ? 'Memproses...' : 'Upload dari Perangkat'}</span>
                </button>

                {currentPhoto && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isProcessing}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-stone-500">
                Pilih atau seret foto langsung dari galeri HP, laptop, atau komputer lokal Anda.
              </p>

              {fileDetails && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono">
                  <CheckCircle2 className="w-3 h-3 text-[#00A651]" />
                  <span>{fileDetails.name}</span>
                  <span className="text-emerald-600 font-semibold">({fileDetails.sizeKb} KB siap disimpan)</span>
                </div>
              )}
            </div>

            {/* Hidden Native File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onInputChange}
              className="hidden"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
