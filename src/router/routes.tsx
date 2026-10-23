import { lazy, Suspense, useEffect, useMemo, type ComponentType, type LazyExoticComponent } from 'react';
import { modules } from '@/app/modules';
import HomePage from '@/pages/home/HomePage';
import { matchPath, ParamsProvider, useLocation } from './router';
import { RouteLoading } from '@/components/ui/RouteLoading';

type Page = ComponentType | LazyExoticComponent<ComponentType>;

interface RouteDef {
  path: string;
  component: Page;
}

/* Páginas carregadas sob demanda: cada uma vira um arquivo separado no build. */
const ModulePage = lazy(() => import('@/pages/module/ModulePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const DatabasePage = lazy(() => import('@/pages/database/DatabasePage'));
const CharacterFilePage = lazy(() => import('@/pages/database/CharacterFilePage'));
const MultiversePage = lazy(() => import('@/pages/multiverse/MultiversePage'));
const LibraryPage = lazy(() => import('@/pages/library/LibraryPage'));
const EntryPage = lazy(() => import('@/pages/library/EntryPage'));
const KamarTajPage = lazy(() => import('@/pages/library/kamar-taj/KamarTajPage'));
const FamePage = lazy(() => import('@/pages/fame/FamePage'));
const FactionsPage = lazy(() => import('@/pages/factions/FactionsPage'));
const FactionPage = lazy(() => import('@/pages/factions/FactionPage'));
const MapPage = lazy(() => import('@/pages/map/MapPage'));
const AdminPage = lazy(() => import('@/admin/AdminPage'));

/**
 * Tabela de rotas. Quando um módulo ficar pronto, adicione aqui a rota real
 * (ex.: { path: '/database', component: lazy(() => import('@/pages/database/DatabasePage')) })
 * antes da linha que gera as telas "em desenvolvimento".
 */
export const routes: RouteDef[] = [
  { path: '/', component: HomePage },
  { path: '/database', component: DatabasePage },
  { path: '/database/:slug', component: CharacterFilePage },
  { path: '/multiverso/*', component: MultiversePage },
  { path: '/biblioteca', component: LibraryPage },
  { path: '/biblioteca/kamar-taj', component: KamarTajPage },
  { path: '/biblioteca/:slug', component: EntryPage },
  { path: '/fama/*', component: FamePage },
  { path: '/faccoes', component: FactionsPage },
  { path: '/faccoes/:slug', component: FactionPage },
  { path: '/mapa/*', component: MapPage },
  { path: '/admin/*', component: AdminPage },
  ...modules.map((m) => ({ path: `${m.path}/*`, component: ModulePage })),
];

export function AppRoutes() {
  const { pathname, hash } = useLocation();

  const resolved = useMemo(() => {
    for (const route of routes) {
      const match = matchPath(route.path, pathname);
      if (match) return { route, params: match.params };
    }
    return { route: { path: '*', component: NotFoundPage }, params: {} };
  }, [pathname]);

  // Troca de página: vai à âncora pedida (esperando o conteúdo carregar) ou ao topo.
  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!id) {
      window.scrollTo(0, 0);
      return;
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) {
        window.clearInterval(timer);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [pathname, hash]);

  const Component = resolved.route.component;

  return (
    <ParamsProvider value={resolved.params}>
      <Suspense fallback={<RouteLoading />}>
        <div className="page" key={resolved.route.path}>
          <Component />
        </div>
      </Suspense>
    </ParamsProvider>
  );
}
