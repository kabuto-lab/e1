/**
 * Image Upload Component
 * Drag & Drop file upload with preview and progress
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api, resolveUploadMimeType } from '@/lib/api-client';

interface ImageUploadProps {
  onUploadComplete: (mediaId: string, cdnUrl: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  modelId?: string;
}

export default function ImageUpload({
  onUploadComplete,
  onError,
  accept = 'image/*',
  maxSize = 104857600, // 100MB
  modelId,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${maxSize / 1048576}MB`;
    }
    if (!accept.includes(file.type) && !accept.includes('*')) {
      return `Invalid file type. Accepted: ${accept}`;
    }
    return null;
  };

  /** Загружает один файл. Не трогает isUploading/progress — этим управляет вызывающий батч. */
  const uploadSingleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    try {
      const mimeType = resolveUploadMimeType(file);
      const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: mimeType as any,
        fileSize: file.size,
        ...(modelId ? { modelId } : {}),
      });

      await api.uploadToMinIO(uploadUrl, file, mimeType);

      await api.confirmUpload(mediaId, {
        cdnUrl,
        modelId,
        metadata: {
          originalName: file.name,
        },
      });

      onUploadComplete(mediaId, cdnUrl);
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onUploadComplete, onError, accept, maxSize, modelId]);

  /** Один спиннер/прогресс-бар на весь батч: файлы грузятся строго по очереди (await). */
  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      await uploadSingleFile(files[i]);
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setIsUploading(false);
    setTimeout(() => setProgress(0), 2000);
  }, [uploadSingleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files ?? []);
    void uploadFiles(files);
  }, [uploadFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    void uploadFiles(files);
    e.target.value = '';
  }, [uploadFiles]);

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-[#d4af37] bg-[#d4af37]/10'
            : 'border-white/[0.06] hover:border-[#d4af37]/50 hover:bg-[#141414]'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
            <div>
              <div className="text-white font-medium">Загрузка...</div>
              <div className="text-gray-400 text-sm">{progress}%</div>
            </div>
            <div className="w-full bg-[#141414] rounded-full h-2">
              <div
                className="bg-[#d4af37] h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-[#141414] rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-[#d4af37]" />
            </div>
            <div>
              <div className="text-white font-medium">
                Перетащите фото сюда или кликните
              </div>
              <div className="text-gray-400 text-sm mt-1">
                JPEG, PNG, WebP до 100MB
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}
    </div>
  );
}
