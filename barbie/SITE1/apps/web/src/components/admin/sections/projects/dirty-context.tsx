'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * DirtyProvider — защита от потери несохранённых данных в разделе «Салоны».
 *
 * Любой редактор регистрирует свой «грязный» статус через useRegisterDirty(id,
 * dirty). Пока есть хоть один грязный источник:
 *   - `beforeunload` → нативное предупреждение браузера (перезагрузка / закрытие
 *     вкладки / ввод URL / hard-навигация);
 *   - перехват кликов по внутренним ссылкам (`<a href="/...">`, например пункты
 *     Rail) → confirm перед уходом со страницы.
 *
 * Это страхует от нечаянных нажатий: токены карточки правятся в state до кнопки
 * «Сохранить», и без guard их легко потерять кликом мимо.
 */

interface DirtyCtxValue {
  register: (id: string, dirty: boolean) => void;
  dirtyCount: number;
}

const DirtyCtx = createContext<DirtyCtxValue>({
  register: () => {},
  dirtyCount: 0,
});

const CONFIRM_TEXT = 'На странице есть несохранённые изменения. Уйти без сохранения?';

export function DirtyProvider({ children }: { children: React.ReactNode }) {
  const setRef = useRef<Set<string>>(new Set());
  const [dirtyCount, setDirtyCount] = useState(0);

  const register = useCallback((id: string, dirty: boolean) => {
    const s = setRef.current;
    if (dirty && !s.has(id)) {
      s.add(id);
      setDirtyCount(s.size);
    } else if (!dirty && s.has(id)) {
      s.delete(id);
      setDirtyCount(s.size);
    }
  }, []);

  // beforeunload — reload / close / hard-nav.
  useEffect(() => {
    if (dirtyCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirtyCount]);

  // Перехват внутренней soft-навигации (Rail = <a href="/admin/...">).
  useEffect(() => {
    if (dirtyCount === 0) return;
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      // только внутренние переходы, уводящие со страницы; новые вкладки и якоря — мимо
      if (!href.startsWith('/') || a.target === '_blank') return;
      if (href === window.location.pathname) return;
      if (!window.confirm(CONFIRM_TEXT)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [dirtyCount]);

  return <DirtyCtx.Provider value={{ register, dirtyCount }}>{children}</DirtyCtx.Provider>;
}

/** Регистрирует грязный статус источника `id`; снимает при размонтировании. */
export function useRegisterDirty(id: string, dirty: boolean): void {
  const { register } = useContext(DirtyCtx);
  useEffect(() => {
    register(id, dirty);
    return () => register(id, false);
  }, [id, dirty, register]);
}

export function useDirtyCount(): number {
  return useContext(DirtyCtx).dirtyCount;
}
