'use client';

/**
 * «Доли» — назначение managerCommissionRate моделям, сгруппированным по менеджеру.
 * Доступно admin и moderator (см. PUT /models/:id в models.controller.ts —
 * managerCommissionRate пишет только admin/moderator, менеджер сам себе долю не назначает).
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api, type Profile } from '@/lib/api-client';

type Manager = { id: string; login: string | null; email: string | null };

function managerLabel(m: Manager): string {
  return m.login ?? m.email ?? m.id.slice(0, 8);
}

function ShareInput({
  model,
  onSaved,
}: {
  model: Profile;
  onSaved: (modelId: string, rate: string | null) => void;
}) {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const initialPercent = model.managerCommissionRate != null ? Math.round(Number(model.managerCommissionRate) * 100) : 0;
  const [value, setValue] = useState(String(initialPercent));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const percent = Math.min(100, Math.max(0, Number(value) || 0));
    setValue(String(percent));
    if (percent === initialPercent) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateModelManagerShare(model.id, percent);
      onSaved(model.id, updated.managerCommissionRate);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось сохранить долю');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-20">
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          disabled={saving}
          className={`${t.inputXs} pr-5 text-right`}
        />
        <span className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs ${t.muted}`}>%</span>
      </div>
      {saving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white/40" />}
      {saved && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
      <span className={`text-xs ${t.muted}`}>модели: {100 - (Math.min(100, Math.max(0, Number(value) || 0)))}%</span>
    </div>
  );
}

function ModelsTable({ models, onSaved }: { models: Profile[]; onSaved: (modelId: string, rate: string | null) => void }) {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  return (
    <div className={t.tableWrap}>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className={t.th}>Модель</th>
            <th className={t.th}>Доля менеджера</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id} className={t.tr}>
              <td className={t.td}>{m.displayName}</td>
              <td className={t.td}>
                <ShareInput model={m} onSaved={onSaved} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModelManagerSharesSection() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

  const [models, setModels] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelRows, managerRows] = await Promise.all([api.getMyModels(500), api.listManagers()]);
      setModels(modelRows);
      setManagers(managerRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSaved = (modelId: string, rate: string | null) => {
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, managerCommissionRate: rate } : m)));
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm ${t.muted}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${t.noticeErr}`}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  const withoutManager = models.filter((m) => !m.managerId);
  const managersWithModels = managers
    .map((mgr) => ({ manager: mgr, models: models.filter((m) => m.managerId === mgr.id) }))
    .filter((g) => g.models.length > 0);

  return (
    <div className="space-y-6">
      {managersWithModels.map(({ manager, models: mgrModels }) => (
        <div key={manager.id} className="space-y-2">
          <h3 className={`text-sm font-semibold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
            Менеджер: {managerLabel(manager)}{' '}
            <span className={`font-normal ${t.muted}`}>({mgrModels.length})</span>
          </h3>
          <ModelsTable models={mgrModels} onSaved={handleSaved} />
        </div>
      ))}

      {withoutManager.length > 0 && (
        <div className="space-y-2">
          <h3 className={`text-sm font-semibold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
            Без менеджера{' '}
            <span className={`font-normal ${t.muted}`}>({withoutManager.length})</span>
          </h3>
          <ModelsTable models={withoutManager} onSaved={handleSaved} />
        </div>
      )}

      {models.length === 0 && (
        <p className={`text-sm ${t.muted}`}>Моделей пока нет</p>
      )}
    </div>
  );
}
