'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { api, resolveUploadMimeType } from '@/lib/api-client';

const GESTURES = [
  'Поднимите вверх два пальца — указательный и средний',
  'Покажите открытую ладонь, пальцы разведены',
  'Прикоснитесь указательным пальцем к кончику носа',
  'Скрестите руки перед собой',
  'Покажите большой палец вверх',
  'Помашите рукой в камеру',
];

const MAX_SECONDS = 8;

type Stage = 'idle' | 'requesting' | 'ready' | 'recording' | 'preview' | 'uploading' | 'error';

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function VideoGestureRecorder({
  modelId,
  onUploaded,
}: {
  modelId: string;
  onUploaded: (cdnUrl: string) => void;
}) {
  const [gesture] = useState(() => GESTURES[Math.floor(Math.random() * GESTURES.length)]);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(MAX_SECONDS);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => stopStream, []);

  const startCamera = async () => {
    setError(null);
    setStage('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setStage('ready');
      requestAnimationFrame(() => {
        if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
      });
    } catch {
      setError('Не удалось получить доступ к камере. Проверьте разрешения в браузере.');
      setStage('error');
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    const mimeType = pickSupportedMimeType();
    if (!stream || !mimeType) {
      setError('Запись видео не поддерживается в этом браузере.');
      setStage('error');
      return;
    }
    mimeTypeRef.current = mimeType;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      blobRef.current = blob;
      stopStream();
      setStage('preview');
      requestAnimationFrame(() => {
        if (previewVideoRef.current) previewVideoRef.current.src = URL.createObjectURL(blob);
      });
    };

    recorderRef.current = recorder;
    recorder.start();
    setStage('recording');
    setSecondsLeft(MAX_SECONDS);

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const retake = () => {
    blobRef.current = null;
    setError(null);
    void startCamera();
  };

  const submit = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setStage('uploading');
    setError(null);

    try {
      const ext = mimeTypeRef.current.startsWith('video/mp4') ? 'mp4' : 'webm';
      const cleanMime = mimeTypeRef.current.split(';')[0];
      const file = new File([blob], `verification-video.${ext}`, { type: cleanMime });
      const mimeType = resolveUploadMimeType(file);

      const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: mimeType as any,
        fileSize: file.size,
        modelId,
      });
      await api.uploadToMinIO(uploadUrl, file, mimeType);
      await api.confirmUpload(mediaId, {
        cdnUrl,
        modelId,
        metadata: { originalName: file.name, gesture },
        isPublicVisible: false,
        albumCategory: 'verification_video',
      });

      onUploaded(cdnUrl);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка загрузки видео');
      setStage('preview');
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-3 py-2.5">
        <p className="text-xs font-medium text-amber-300/60">Повторите на видео:</p>
        <p className="mt-0.5 text-sm font-semibold text-amber-200">{gesture}</p>
      </div>

      {(stage === 'ready' || stage === 'recording') && (
        <div className="relative overflow-hidden rounded-lg border border-amber-400/25 bg-black">
          <video ref={liveVideoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
          {stage === 'recording' && (
            <span className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-rose-500/90 px-2 py-0.5 text-xs font-semibold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              {secondsLeft}с
            </span>
          )}
        </div>
      )}

      {stage === 'preview' && (
        <video ref={previewVideoRef} controls playsInline className="aspect-video w-full rounded-lg border border-amber-400/25 object-cover" />
      )}

      {error && <span className="block text-xs text-rose-300">{error}</span>}

      <div className="flex flex-wrap items-center gap-3">
        {stage === 'idle' && (
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/20"
          >
            <Video className="h-3.5 w-3.5" />
            Включить камеру
          </button>
        )}

        {stage === 'requesting' && (
          <span className="inline-flex items-center gap-2 text-xs text-amber-300/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Запрашиваем доступ к камере…
          </span>
        )}

        {stage === 'ready' && (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/20"
          >
            <Video className="h-3.5 w-3.5" />
            Записать ({MAX_SECONDS} сек)
          </button>
        )}

        {stage === 'recording' && (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-400/20"
          >
            Остановить
          </button>
        )}

        {stage === 'preview' && (
          <>
            <button
              type="button"
              onClick={retake}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-transparent px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Записать заново
            </button>
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Отправить видео
            </button>
          </>
        )}

        {stage === 'uploading' && (
          <span className="inline-flex items-center gap-2 text-xs text-amber-300/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Загружаем видео…
          </span>
        )}

        {stage === 'error' && (
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/20"
          >
            Попробовать снова
          </button>
        )}
      </div>
    </div>
  );
}
