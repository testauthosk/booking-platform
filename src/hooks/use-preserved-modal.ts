import { useEffect, useRef, useCallback } from 'react';

/**
 * Хук для збереження стану модалки на певний час після закриття.
 * Якщо модалка відкривається знову до таймауту — стан зберігається.
 * Якщо ні — викликається resetFn.
 * 
 * @param isOpen - чи відкрита модалка
 * @param resetFn - функція очищення стану
 * @param preserveMs - час збереження в мс (за замовчуванням 3 хвилини)
 */
export function usePreservedModal(
  isOpen: boolean,
  resetFn: () => void,
  preserveMs: number = 3 * 60 * 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Модалка відкрилась — скасувати таймер очищення
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      hasDataRef.current = true;
    } else if (hasDataRef.current) {
      // Модалка закрилась і були дані — запустити таймер
      timeoutRef.current = setTimeout(() => {
        resetFn();
        hasDataRef.current = false;
        timeoutRef.current = null;
      }, preserveMs);
    }

    // Cleanup при unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, resetFn, preserveMs]);

  // Функція для примусового очищення (якщо потрібно)
  const clearNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    resetFn();
    hasDataRef.current = false;
  }, [resetFn]);

  return { clearNow };
}
