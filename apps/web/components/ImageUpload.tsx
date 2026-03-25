/**
 * Image Upload Component
 * Drag & Drop file upload with preview and progress
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api-client';

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

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get presigned URL
      setProgress(10);
      const { uploadUrl, storageKey, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: file.type as any,
        fileSize: file.size,
      });

      // Step 2: Upload to MinIO directly
      setProgress(30);
      await api.uploadToMinIO(uploadUrl, file);
      setProgress(80);

      // Step 3: Confirm upload with modelId
      await api.confirmUpload(mediaId, {
        cdnUrl,
        modelId,
        metadata: {
          originalName: file.name,
        },
      });
      setProgress(100);

      // Notify parent
      onUploadComplete(mediaId, cdnUrl);
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }, [onUploadComplete, onError, accept, maxSize]);

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

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

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
            : 'border-[#333] hover:border-[#d4af37]/50 hover:bg-[#1a1a1a]'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
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
            <div className="w-full bg-[#1a1a1a] rounded-full h-2">
              <div
                className="bg-[#d4af37] h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center">
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
