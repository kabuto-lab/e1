'use client';

import { useEffect } from 'react';

export function useUnsavedWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const originalPush = window.history.pushState.bind(window.history);
    window.history.pushState = function (...args: Parameters<typeof originalPush>) {
      if (window.confirm('У вас есть несохранённые изменения. Покинуть страницу?')) {
        originalPush(...args);
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.history.pushState = originalPush;
    };
  }, [isDirty]);
}
