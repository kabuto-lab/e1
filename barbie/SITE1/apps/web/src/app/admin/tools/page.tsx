'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/primitives/PageHeader';
import { Card } from '@/components/admin/primitives/Card';
import { AnalyzeForm } from '@/components/admin/sections/tools/AnalyzeForm';
import { AnalysisResult } from '@/components/admin/sections/tools/AnalysisResult';
import type { SiteAnalysis } from '@/lib/tools-api';

/**
 * /admin/tools — landing page для парсера сайтов.
 *
 *  1. Ввод URL → POST /v1/tools/analyze-site
 *  2. Бэкенд скачивает HTML, парсит → возвращает identity / typography /
 *     palette / structure / images
 *  3. UI рендерит результат разбитый на 5 карточек
 *  4. CTA "Создать прототип" — stub: соберёт single-file HTML preview
 *     (генератор в разработке).
 */
export default function ToolsPage() {
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);

  function onGenerate(): void {
    alert(
      'Генератор прототипа пока в разработке. На основе уже извлечённых' +
        ' данных (палитра / fonts / структура) собирается single-file HTML' +
        ' preview — следующая итерация.',
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Инструменты"
        sub="парсер сайтов · генератор прототипов"
      />

      <Card
        title="Парсер сайта"
        sub="вставь URL → достанет content + visual style"
      >
        <AnalyzeForm onResult={setAnalysis} busy={busy} setBusy={setBusy} />
      </Card>

      {analysis && <AnalysisResult analysis={analysis} onGenerate={onGenerate} />}

      {!analysis && !busy && (
        <Card title="Workflow" sub="как это работает">
          <ol className="space-y-2.5 text-[13px] text-text-dim list-decimal list-inside">
            <li>
              Вставь ссылку на любой публичный проект (свой деплой, чужой
              лендинг, конкурента — что угодно с http/https).
            </li>
            <li>
              Бэкенд скачает HTML (≤ 2MB, timeout 10s), пройдёт regex'ами по
              разметке и инлайн-стилям.
            </li>
            <li>
              Получишь набор «сигналов» — палитра, шрифты, заголовки, CTA,
              картинки.
            </li>
            <li>
              Нажмёшь «Создать прототип» — собирается single-file HTML с
              похожей визуальной системой (генератор в разработке).
            </li>
          </ol>
          <div className="mt-4 pt-4 border-t border-line text-[11px] text-text-mute font-mono leading-relaxed">
            SSRF-защита: запросы на localhost / .local / private IP блокируются на
            бэкенде. Если нужно проанализировать локальный dev — деплой на
            публичный VPS.
          </div>
        </Card>
      )}
    </div>
  );
}
