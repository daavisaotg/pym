import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';

/**
 * Roteador próprio e enxuto (sem dependências).
 *
 * - modo "history": URLs limpas (/database/peter-parker). Usado no GitHub Pages
 *   com o 404.html gerado no build.
 * - modo "hash": URLs com # (/#/database). Útil em prévias e hospedagens sem fallback.
 *
 * A API (Link, useLocation, useNavigate, useParams) espelha a do React Router,
 * então migrar para ele no futuro é troca de import.
 */

type Mode = 'history' | 'hash';

const MODE: Mode = import.meta.env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'history';
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export interface Location {
  pathname: string;
  hash: string;
  search: string;
}

function readLocation(): Location {
  if (MODE === 'hash') {
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const [pathAndSearch, hash = ''] = raw.split('#');
    const [pathname, search = ''] = pathAndSearch.split('?');
    return { pathname: pathname || '/', search: search ? `?${search}` : '', hash: hash ? `#${hash}` : '' };
  }
  let pathname = window.location.pathname;
  if (BASE && pathname.startsWith(BASE)) pathname = pathname.slice(BASE.length) || '/';
  return { pathname, search: window.location.search, hash: window.location.hash };
}

export function toHref(to: string): string {
  if (/^(https?:|mailto:)/.test(to)) return to;
  if (MODE === 'hash') return `#${to}`;
  return `${BASE}${to}`;
}

interface RouterValue {
  location: Location;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(readLocation);

  useEffect(() => {
    const sync = () => setLocation(readLocation());
    window.addEventListener('popstate', sync);
    if (MODE === 'hash') window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const href = toHref(to);
    if (options?.replace) window.history.replaceState(null, '', href);
    else window.history.pushState(null, '', href);
    setLocation(readLocation());
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter precisa estar dentro de <RouterProvider>.');
  return ctx;
}

export const useLocation = () => useRouter().location;
export const useNavigate = () => useRouter().navigate;

/* ── Correspondência de rotas ───────────────────────────────── */

export interface RouteMatch {
  params: Record<string, string>;
}

/** "/database/:slug" casa com "/database/peter-parker" → { slug: "peter-parker" } */
export function matchPath(pattern: string, pathname: string): RouteMatch | null {
  const clean = (p: string) => p.replace(/\/+$/, '') || '/';
  // "/mapa/*" casa com "/mapa" e qualquer subcaminho; o resto vai em params["*"]
  if (pattern.endsWith('/*')) {
    const prefix = clean(pattern.slice(0, -2));
    const path = clean(pathname);
    if (path === prefix) return { params: { '*': '' } };
    if (path.startsWith(`${prefix}/`)) return { params: { '*': decodeURIComponent(path.slice(prefix.length + 1)) } };
    return null;
  }
  const a = clean(pattern).split('/');
  const b = clean(pathname).split('/');
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return { params };
}

const ParamsContext = createContext<Record<string, string>>({});
export const ParamsProvider = ParamsContext.Provider;
export const useParams = <T extends Record<string, string>>() => useContext(ParamsContext) as T;

/* ── Link ───────────────────────────────────────────────────── */

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}

export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const { navigate, location } = useRouter();
  const external = /^(https?:|mailto:)/.test(to);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || external) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    const [path, anchor] = to.split('#');
    if (anchor && (path === '' || path === location.pathname)) {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(to, { replace });
  };

  return (
    <a
      href={toHref(to)}
      onClick={handleClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Verdadeiro quando o caminho atual está dentro de `path`. */
export function useIsActive(path: string): boolean {
  const { pathname } = useLocation();
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Lê e grava a query string da rota atual (ex.: filtros do Database). */
export function useSearchParams(): [URLSearchParams, (next: URLSearchParams) => void] {
  const { location, navigate } = useRouter();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const set = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
    },
    [location.pathname, navigate],
  );
  return [params, set];
}
