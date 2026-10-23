import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rawCity from '@/content/city.json';
import rawAscent from '@/content/ascent.json';
import rawWorld from '@/content/world.json';
import type { CityContent, CityLayerId, WorldContent } from '@/data/city';
import { useLocation, useNavigate, useParams, Link } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { prefersReducedMotion } from '@/lib/asset';
import { SidePanel } from '../multiverse/SidePanel';
import { CityMap, type EntityKey } from './city/CityMap';
import { CityPanel, LayerPanel } from './city/CityPanel';
import { CityIndex } from './city/CityIndex';
import { FactsDrawer } from './city/FactsDrawer';
import { LayerSwitch } from './city/LayerSwitch';
import { Passage, type PassageKind } from './city/Passage';
import { WorldMap } from './world/WorldMap';
import { RealmPanel } from './world/RealmPanel';
import type { Inset, Pad } from './usePanZoom';
import styles from './Map.module.css';

/** Cidades com mapa próprio. A primeira abre em /mapa; as outras em /mapa/<slug>. */
const cities = [rawCity, rawAscent] as unknown as CityContent[];
const cityPath = (c: CityContent) => (c.slug ? `/mapa/${c.slug}` : '/mapa');
const world = rawWorld as unknown as WorldContent;
const realms = world.realms.filter((r) => !r.draft);

const LAYER_ORDER: CityLayerId[] = ['superior', 'cidade', 'inferioridade', 'campos'];

/** Espaço do painel aberto, para a câmera centralizar no que sobra. */
function usePanelInset(open: boolean): Inset {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return useMemo(() => {
    if (!open) return { right: 0, bottom: 0 };
    if (size.w >= 900) return { right: Math.min(540, size.w * 0.42) + 24, bottom: 0 };
    return { right: 0, bottom: Math.round(size.h * 0.58) };
  }, [open, size]);
}

/** Espaço que o HUD ocupa em cada modo e tamanho de tela. */
function useHudPad(mode: 'cidade' | 'mundo'): Pad {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return useMemo(() => {
    const portrait = size.w / size.h < 0.8;
    if (portrait) return mode === 'cidade' ? { top: 280, bottom: 90 } : { top: 230, bottom: 170 };
    if (mode === 'cidade') return size.w >= 1100 ? { left: 400, top: 70, right: 30 } : { top: 300, bottom: 60 };
    return { top: 250, bottom: 20 };
  }, [mode, size]);
}

/** Acha o registro da cidade pelo slug. */
function findEntityIn(city: CityContent, slug: string | null): { key: EntityKey; layer: CityLayerId } | null {
  if (!slug) return null;
  const d = city.districts.find((x) => x.slug === slug && !x.draft);
  if (d) return { key: `district:${d.id}`, layer: d.layer };
  const s = city.streets.find((x) => x.slug === slug && !x.draft);
  if (s) return { key: `street:${s.id}`, layer: s.layer };
  const p = city.places.find((x) => x.slug === slug && !x.draft);
  if (p) return { key: `place:${p.id}`, layer: p.layer };
  return null;
}

function slugIn(city: CityContent, key: EntityKey): string {
  const [type, id] = key.split(':');
  const list = type === 'district' ? city.districts : type === 'street' ? city.streets : city.places;
  return list.find((x) => x.id === id)?.slug ?? id;
}

interface Target {
  mode?: 'cidade' | 'mundo';
  camada?: CityLayerId;
  local?: string;
  ficha?: boolean;
}

export default function MapPage() {
  const params = useParams<{ '*': string }>();
  const rest = (params['*'] ?? '').split('/')[0];
  const mode: 'cidade' | 'mundo' = rest === 'explorar' ? 'mundo' : 'cidade';
  const city = cities.find((c) => c.slug === rest) ?? cities[0];
  // Cada cidade (e o modo Explorar) monta do zero: câmera, camada e painéis próprios
  return <MapView key={mode === 'mundo' ? 'mundo' : city.id} mode={mode} city={city} />;
}

function MapView({ mode, city }: { mode: 'cidade' | 'mundo'; city: CityContent }) {
  const { search } = useLocation();
  const navigate = useNavigate();
  const q = useMemo(() => new URLSearchParams(search), [search]);
  const layerIds = city.layers.map((l) => l.id);
  const findEntity = (slug: string | null) => findEntityIn(city, slug);
  const slugOf = (key: EntityKey) => slugIn(city, key);

  const go = useCallback(
    (t: Target, opts?: { replace?: boolean }) => {
      const sp = new URLSearchParams();
      if (t.camada && t.camada !== 'cidade') sp.set('camada', t.camada);
      if (t.local) sp.set('local', t.local);
      if (t.ficha) sp.set('ficha', 'camada');
      const qs = sp.toString();
      navigate(`${(t.mode ?? mode) === 'mundo' ? '/mapa/explorar' : cityPath(city)}${qs ? `?${qs}` : ''}`, opts);
    },
    [mode, navigate, city],
  );

  /* ── Cidade ──────────────────────────────────── */

  const entity = mode === 'cidade' ? findEntity(q.get('local')) : null;
  const askedLayer = layerIds.includes(q.get('camada') ?? '') ? (q.get('camada') as CityLayerId) : layerIds.includes('cidade') ? 'cidade' : layerIds[0];
  const requested: CityLayerId = entity?.layer ?? askedLayer;
  const layerSheet = mode === 'cidade' && !entity && q.get('ficha') === 'camada';

  // Camada exibida: troca no meio da transição (túnel ou elevador)
  const [shown, setShown] = useState<CityLayerId>(requested);
  const [passage, setPassage] = useState<{ kind: PassageKind; n: number } | null>(null);
  useEffect(() => {
    if (requested === shown) return;
    const tunnel = requested === 'campos' || shown === 'campos';
    if (prefersReducedMotion()) {
      setShown(requested);
      return;
    }
    const kind: PassageKind = tunnel
      ? requested === 'campos'
        ? 'tunel-ida'
        : 'tunel-volta'
      : LAYER_ORDER.indexOf(requested) < LAYER_ORDER.indexOf(shown)
        ? 'subir'
        : 'descer';
    setPassage((p) => ({ kind, n: (p?.n ?? 0) + 1 }));
    const t1 = window.setTimeout(() => setShown(requested), tunnel ? 480 : 260);
    const t2 = window.setTimeout(() => setPassage(null), tunnel ? 1500 : 950);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  const layer = city.layers.find((l) => l.id === shown) ?? city.layers[0];
  const selected = entity && entity.layer === shown ? entity.key : undefined;

  // A câmera só viaja quando a seleção vem de fora do mapa ou é um ponto/rua
  const [focusNonce, setFocusNonce] = useState(0);
  const fromMapDistrict = useRef(false);
  useEffect(() => {
    if (!selected) return;
    if (fromMapDistrict.current) {
      fromMapDistrict.current = false;
      return;
    }
    setFocusNonce((n) => n + 1);
  }, [selected]);

  const [factsOpen, setFactsOpen] = useState(false);

  const selectEntity = useCallback(
    (key: EntityKey | null, fromMap = false) => {
      if (!key) {
        if (entity || layerSheet) go({ camada: shown });
        return;
      }
      if (fromMap && key.startsWith('district:')) fromMapDistrict.current = true;
      setFactsOpen(false);
      const target = findEntity(slugOf(key));
      go({ camada: target?.layer ?? shown, local: slugOf(key) });
    },
    [entity, layerSheet, go, shown],
  );

  const selectFromList = useCallback(
    (key: EntityKey) => {
      selectEntity(key);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },
    [selectEntity],
  );

  const changeLayer = useCallback(
    (l: CityLayerId) => {
      setFactsOpen(false);
      go({ camada: l });
    },
    [go],
  );

  /* ── Mundo ───────────────────────────────────── */

  const realm = mode === 'mundo' ? realms.find((r) => r.slug === q.get('local')) : undefined;
  const [realmNonce, setRealmNonce] = useState(0);
  useEffect(() => {
    if (realm) setRealmNonce((n) => n + 1);
  }, [realm]);

  /* ── Painel ──────────────────────────────────── */

  const panelOpen = Boolean(selected || layerSheet || realm);
  const inset = usePanelInset(panelOpen);
  const pad = useHudPad(mode);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.documentElement.dataset.scrollLock !== undefined) return;
      go({ camada: shown });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, go, shown]);

  const toggleFacts = useCallback(
    (open: boolean) => {
      setFactsOpen(open);
      if (open && panelOpen) go({ camada: shown }, { replace: true });
    },
    [panelOpen, go, shown],
  );

  const showFact = useCallback(
    (slug: string) => {
      const target = findEntity(slug);
      setFactsOpen(false);
      if (target) go({ camada: target.layer, local: slug });
    },
    [go],
  );

  /* ── SEO ─────────────────────────────────────── */

  const entityName = (() => {
    if (!selected) return undefined;
    const [type, id] = selected.split(':');
    const list = type === 'district' ? city.districts : type === 'street' ? city.streets : city.places;
    return list.find((x) => x.id === id)?.name;
  })();
  const title = mode === 'mundo' ? (realm ? `${realm.name}: Explorar` : 'Explorar') : entityName ? `${entityName}, ${city.name}` : `Mapa de ${city.name}`;
  const description = mode === 'mundo' ? (realm?.summary ?? world.summary) : city.summary;

  return (
    <div className={styles.page}>
      <Seo title={title} description={description} />

      <section className={styles.stage} aria-label={mode === 'mundo' ? 'Mapa do mundo' : `Mapa de ${city.name}`} data-mode={mode} data-layer={shown} data-open={panelOpen || undefined}>
        {mode === 'cidade' ? (
          <CityMap city={city} layer={shown} selected={selected} onSelect={(k) => selectEntity(k, true)} inset={inset} pad={pad} focusNonce={focusNonce} />
        ) : (
          <WorldMap realms={realms} selected={realm?.slug} onSelect={(slug) => go({ mode: 'mundo', local: slug ?? undefined })} inset={inset} pad={pad} focusNonce={realmNonce} />
        )}

        <header className={styles.hud}>
          <p className={`${styles.kicker} code`}>MÓDULO MP · {mode === 'mundo' ? world.name.toUpperCase() : city.code}</p>
          <h1 className={styles.h1}>{mode === 'mundo' ? 'Explorar' : city.name}</h1>
          <nav className={styles.tabs} aria-label="Modo do mapa">
            {cities.map((c) => (
              <Link key={c.id} to={cityPath(c)} aria-current={mode === 'cidade' && c.id === city.id ? 'page' : undefined}>
                {c.name}
              </Link>
            ))}
            <Link to="/mapa/explorar" aria-current={mode === 'mundo' ? 'page' : undefined}>
              Explorar
            </Link>
          </nav>
          {mode === 'cidade' ? (
            <div className={styles.layerLine} key={layer.id}>
              <span className={`${styles.level} code`} data-layer={layer.id}>
                {layer.level}
              </span>
              <span className={styles.layerName}>{layer.name}</span>
              {layer.tagline && <span className={styles.tagline}>{layer.tagline}</span>}
              <button type="button" className={styles.about} onClick={() => go({ camada: shown, ficha: true })}>
                {city.layers.length > 1 ? 'Sobre esta camada' : 'Sobre a cidade'}
              </button>
            </div>
          ) : null}
        </header>

        <div className={styles.footer}>
          {mode === 'cidade' ? (
            city.layers.length > 1 && <LayerSwitch layers={city.layers} active={requested} onChange={changeLayer} />
          ) : (
            <ul className={styles.legend} aria-label="Legenda">
              <li>
                <span className={styles.dot} data-kind="home" /> Capital do RP
              </li>
              <li>
                <span className={styles.dot} data-kind="lore" /> Com lore do PYM
              </li>
              <li>
                <span className={styles.dot} data-kind="ref" /> Referência do cânone
              </li>
            </ul>
          )}
          <p className={styles.hint}>Arraste para mover. Ctrl + roda do mouse aproxima.</p>
        </div>

        {mode === 'cidade' && <FactsDrawer city={city} open={factsOpen} onToggle={toggleFacts} onShow={showFact} shifted={panelOpen} />}

        {passage && <Passage key={passage.n} kind={passage.kind} />}

        {selected && (
          <SidePanel contentKey={selected} label={`Ficha: ${entityName}`} onClose={() => go({ camada: shown })}>
            <CityPanel
              city={city}
              entity={selected}
              onSelect={(k) => selectEntity(k)}
              onLayer={changeLayer}
              cityName={(id) => cities.find((c) => c.id === id)?.name}
              onCity={(id) => {
                const target = cities.find((c) => c.id === id);
                if (target) navigate(cityPath(target));
              }}
            />
          </SidePanel>
        )}
        {layerSheet && (
          <SidePanel contentKey={`layer:${layer.id}`} label={`Camada: ${layer.name}`} onClose={() => go({ camada: shown })}>
            <LayerPanel city={city} layer={layer} onSelect={(k) => selectEntity(k)} />
          </SidePanel>
        )}
        {realm && (
          <SidePanel contentKey={realm.id} label={`Ficha: ${realm.name}`} onClose={() => go({ mode: 'mundo' })}>
            <RealmPanel realm={realm} />
          </SidePanel>
        )}
      </section>

      {mode === 'cidade' ? (
        <CityIndex city={city} onSelect={selectFromList} onLayer={(l) => (changeLayer(l), window.scrollTo({ top: 0, behavior: 'smooth' }))} />
      ) : (
        <section className={`container ${styles.realms}`} aria-labelledby="registro-mundo">
          <header>
            <p className={`${styles.kicker} code`}>REGISTRO · {world.name.toUpperCase()}</p>
            <h2 id="registro-mundo" className={styles.h2}>
              Países e reinos
            </h2>
            <p className={styles.lede}>{world.summary}</p>
          </header>
          <ul className={styles.realmGrid}>
            {realms.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={styles.realmCard}
                  data-reference={r.reference || undefined}
                  onClick={() => {
                    go({ mode: 'mundo', local: r.slug });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span className={`${styles.realmKind} code`}>
                    {r.kind} · {r.region}
                  </span>
                  <span className={styles.realmName}>{r.name}</span>
                  <span className={styles.realmText}>{r.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
