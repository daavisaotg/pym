import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const SearchPalette = lazy(() => import('./SearchPalette'));

interface SearchValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SearchContext = createContext<SearchValue | null>(null);

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Busca global: Ctrl/⌘ + K ou "/" abrem de qualquer página. */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const open = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setMounted(true);
        setOpen((v) => !v);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Pré-carrega o código da busca quando o navegador estiver ocioso.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2500));
    idle(() => {
      void import('./SearchPalette');
    });
  }, []);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {mounted && (
        <Suspense fallback={null}>
          <SearchPalette open={isOpen} onClose={close} />
        </Suspense>
      )}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch precisa estar dentro de <SearchProvider>.');
  return ctx;
}
