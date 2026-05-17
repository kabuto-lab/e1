'use client';

import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { toolsApi, type SiteAnalysis } from '@/lib/tools-api';

export function AnalyzeForm({
  onResult,
  busy,
  setBusy,
}: {
  onResult: (a: SiteAnalysis | null) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
}) {
  const [url, setUrl] = useState('https://pentagon.ru/');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    onResult(null);
    try {
      const a = await toolsApi.analyzeSite(url.trim());
      onResult(a);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`);
      } else {
        setError(String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Globe
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
          />
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/"
            disabled={busy}
            className="w-full h-11 bg-bg-elev border border-line rounded-md pl-10 pr-4 text-[14px] font-mono outline-none focus:border-gold/40 placeholder:text-text-mute disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="px-5 h-11 bg-gold text-bg font-semibold rounded-md disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Анализирую…
            </>
          ) : (
            'Анализировать'
          )}
        </button>
      </div>
      <div className="text-[11px] text-text-mute font-mono tracking-wider">
        ОГРАНИЧЕНИЯ · http/https · ≤ 2MB · 10s timeout · публичные IP only
      </div>
      {error && (
        <div className="px-3 py-2 text-[13px] text-red border border-red/30 bg-red/10 rounded-md">
          {error}
        </div>
      )}
    </form>
  );
}
