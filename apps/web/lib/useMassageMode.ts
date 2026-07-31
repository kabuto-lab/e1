'use client';

/**
 * Читает флаг массажного режима из контекста (см. MassageModeProvider в корневом layout.tsx —
 * инициализирован серверным fetch'ем, поэтому первый рендер сразу совпадает с SSR-разметкой).
 */
export { useMassageModeContext as useMassageMode, type MassageMode } from '@/components/MassageModeProvider';
