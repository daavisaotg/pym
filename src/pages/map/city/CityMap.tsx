import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as RMouseEvent,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from 'react';
import type { CityContent, CityDistrict, CityLayerId, CityPlace, CityStreet, Pt } from '@/data/city';
import { usePanZoom, type Inset, type Pad } from '../usePanZoom';
import { MapControls } from '../MapControls';
import {
  BOARD,
  buildBlocks,
  buildGraves,
  buildTrees,
  CAMPOS,
  centroid,
  gridPath,
  ISLAND,
  midpoint,
  PARK,
  sewerPath,
  SHORE_NORTH,
  SHORE_SOUTH,
  toPath,
  bounds,
} from './geometry';
import { PlaceIcon } from './PlaceIcon';
import { ascentBlocks, ascentGrid, ascentTrees, BRIDGES, CANAL, CITY, LAKE, LAND, PARKS, PIER, RIVER } from './ascent';
import styles from './CityMap.module.css';

export type EntityKey = `${'district' | 'street' | 'place'}:${string}`;

interface Props {
  city: CityContent;
  layer: CityLayerId;
  selected?: EntityKey;
  onSelect: (key: EntityKey | null) => void;
  inset: Inset;
  /** Margens ocupadas pelo HUD. */
  pad?: Pad;
  /** Muda para pedir que a câmera vá até a seleção. */
  focusNonce: number;
}

type Level = 'superior' | 'cidade' | 'inferioridade';

/** Estado visual de cada nível conforme a camada ativa. */
function levelState(level: Level, active: CityLayerId): 'active' | 'ghost' | 'under' | 'over' | 'hidden' {
  if (active === 'campos') return 'hidden';
  if (level === active) return 'active';
  if (active === 'cidade') return level === 'superior' ? 'ghost' : 'hidden';
  if (active === 'superior') return level === 'cidade' ? 'under' : 'hidden';
  // Inferioridade ativa: a cidade vira teto
  return level === 'cidade' ? 'over' : 'hidden';
}

/** Onde a câmera deve olhar para cada tipo de registro. */
export function entityFocus(city: CityContent, key: EntityKey): { pt: Pt; zoom: number } | null {
  const [type, id] = key.split(':') as ['district' | 'street' | 'place', string];
  if (type === 'place') {
    const p = city.places.find((x) => x.id === id);
    return p ? { pt: p.at, zoom: 2.6 } : null;
  }
  if (type === 'street') {
    const s = city.streets.find((x) => x.id === id);
    if (!s) return null;
    const b = bounds(s.path);
    const span = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    return { pt: midpoint(s.path), zoom: Math.min(2.4, Math.max(1.1, 900 / span)) };
  }
  const d = city.districts.find((x) => x.id === id);
  if (!d) return null;
  const b = bounds(d.shape);
  const span = Math.max((b.x1 - b.x0) / 1.6, b.y1 - b.y0);
  return { pt: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], zoom: Math.min(2.6, Math.max(1.1, 480 / span)) };
}

interface Hover {
  key: EntityKey;
  label: string;
  kind: string;
}

export function CityMap({ city, layer, selected, onSelect, inset, pad, focusNonce }: Props) {
  const pz = usePanZoom({ board: BOARD, inset, pad });
  const stageRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const visible = useMemo(
    () => ({
      districts: city.districts.filter((d) => !d.draft),
      streets: city.streets.filter((s) => !s.draft),
      places: city.places.filter((p) => !p.draft),
    }),
    [city],
  );

  // Vai até a seleção quando ela muda (ou quando pedem de novo)
  useEffect(() => {
    if (!selected) return;
    const f = entityFocus(city, selected);
    if (f) pz.focus(f.pt, f.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  // Troca de camada sem seleção: recentra (sempre, ao atravessar o túnel)
  const prevLayer = useRef(layer);
  useEffect(() => {
    const crossed = layer === 'campos' || prevLayer.current === 'campos';
    prevLayer.current = layer;
    if (!selected && (crossed || pz.isFollowing())) pz.reset(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer]);

  const pick = useCallback(
    (key: EntityKey) => {
      if (pz.wasDrag()) return;
      onSelect(key);
    },
    [onSelect, pz],
  );

  const onHover = useCallback((h: Hover | null, e?: RPointerEvent) => {
    setHover((prev) => (prev?.key === h?.key ? prev : h));
    if (e && tipRef.current && stageRef.current) {
      const r = stageRef.current.getBoundingClientRect();
      tipRef.current.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
    }
  }, []);

  const onBackground = useCallback(() => {
    if (pz.wasDrag()) return;
    onSelect(null);
  }, [onSelect, pz]);

  const states = {
    superior: levelState('superior', layer),
    cidade: levelState('cidade', layer),
    inferioridade: levelState('inferioridade', layer),
  };

  const common = { selected, hovered: hover?.key, pick, onHover };

  return (
    <div ref={stageRef} className={styles.stage} data-layer={layer} data-native-scroll>
      <svg ref={pz.svgRef} className={styles.svg} role="application" aria-label={`Mapa de ${city.name}`} data-zoom="far">
        <MapDefs />
        <rect className={styles.bgHit} x="-5000" y="-5000" width="12000" height="12000" onClick={onBackground} />
        <g ref={pz.gRef}>
          {city.layout === 'ascent' ? (
            <g className={styles.scene} data-on>
              <AscentBase districts={visible.districts} streets={visible.streets} />
              {city.layers.map((l) => (
                <g key={l.id} className={styles.level} data-level="cidade" data-state={l.id === layer ? 'active' : 'hidden'}>
                  <CityLevel {...common} layer={l.id} active={l.id === layer} {...visible} base={l.id === 'cidade' ? <AscentBlocks city={city} /> : undefined} />
                </g>
              ))}
            </g>
          ) : (
            <>
            <g className={styles.scene} data-on={layer !== 'campos' || undefined}>
              <CityBase layer={layer} />
              <g className={styles.level} data-level="cidade" data-state={states.cidade}>
                <CityLevel {...common} layer="cidade" active={states.cidade === 'active'} {...visible} base={<PymBlocks city={city} />} />
              </g>
              <g className={styles.level} data-level="inferioridade" data-state={states.inferioridade}>
                <UnderBase />
                <CityLevel {...common} layer="inferioridade" active={states.inferioridade === 'active'} {...visible} />
              </g>
              <g className={styles.level} data-level="superior" data-state={states.superior}>
                <SuperiorBase />
                <CityLevel {...common} layer="superior" active={states.superior === 'active'} {...visible} />
              </g>
            </g>
            <g className={styles.scene} data-on={layer === 'campos' || undefined}>
              <CamposBase districts={visible.districts} streets={visible.streets} />
              <g className={styles.level} data-level="campos" data-state={layer === 'campos' ? 'active' : 'hidden'}>
                <CityLevel {...common} layer="campos" active={layer === 'campos'} {...visible} />
              </g>
            </g>
            </>
          )}
        </g>
      </svg>

      <div ref={tipRef} className={styles.tip} data-show={hover ? '' : undefined} aria-hidden="true">
        {hover && (
          <>
            <span className={`${styles.tipKind} code`}>{hover.kind}</span>
            <span className={styles.tipName}>{hover.label}</span>
          </>
        )}
      </div>

      <MapControls onZoomIn={() => pz.zoomAt(1.5)} onZoomOut={() => pz.zoomAt(1 / 1.5)} onReset={() => pz.reset()} />
    </div>
  );
}

/* ── Desenho ─────────────────────────────────────────────────── */

const MapDefs = memo(function MapDefs() {
  return (
    <defs>
      <pattern id="pc-water" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(230,216,188,0.07)" strokeWidth="1" />
      </pattern>
      <pattern id="pc-paper" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" fill="none" stroke="rgba(230,216,188,0.035)" strokeWidth="1" />
      </pattern>
      <pattern id="pc-tech" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M12 0H0V12" fill="none" stroke="rgba(251,248,243,0.12)" strokeWidth="0.8" />
      </pattern>
      <pattern id="pc-furrow" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
        <line x1="0" y1="5" x2="10" y2="5" stroke="rgba(226,189,98,0.35)" strokeWidth="1.4" />
      </pattern>
      <pattern id="pc-rock" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(185,169,139,0.22)" strokeWidth="1.2" />
      </pattern>
      <radialGradient id="pc-under" cx="50%" cy="58%" r="60%">
        <stop offset="0" stopColor="rgba(120,20,10,0.28)" />
        <stop offset="1" stopColor="rgba(0,0,0,0)" />
      </radialGradient>
      <filter id="pc-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
});

/** Água, margens e o chão da ilha. */
const CityBase = memo(function CityBase({ layer }: { layer: CityLayerId }) {
  return (
    <g className={styles.base} data-dim={layer === 'inferioridade' || undefined}>
      <rect x="-3000" y="-3000" width="7600" height="7000" className={styles.water} />
      <rect x="-3000" y="-3000" width="7600" height="7000" fill="url(#pc-water)" />
      <path d={toPath(SHORE_NORTH, true)} className={styles.mainland} />
      <path d={toPath(SHORE_SOUTH, true)} className={styles.mainland} />
      <path d={toPath(ISLAND, true)} className={styles.island} />
      <path d={toPath(ISLAND, true)} fill="url(#pc-paper)" />
      <text x="800" y="150" className={styles.waterLabel}>
        RIO NORTE
      </text>
      <text x="800" y="868" className={styles.waterLabel}>
        RIO SUL
      </text>
    </g>
  );
});

function SuperiorBase() {
  return (
    <g className={styles.superBase} aria-hidden="true">
      {/* Dutos de cobre que correm por cima da cidade */}
      <path className={styles.pipe} d="M120 380C400 360 520 520 760 470S1160 300 1480 330" />
      <path className={styles.pipe} d="M200 820C380 650 560 760 820 640S1240 760 1500 600" />
      <path className={styles.pipe} d="M980 160C960 320 1080 420 1040 600S1120 780 1080 860" />
    </g>
  );
}

const UnderBase = memo(function UnderBase() {
  const sewers = useMemo(() => sewerPath(), []);
  return (
    <g className={styles.underBase} aria-hidden="true">
      <path d={toPath(ISLAND, true)} className={styles.underGround} />
      <path d={toPath(ISLAND, true)} fill="url(#pc-under)" />
      <path d={sewers} className={styles.sewers} />
    </g>
  );
});

const CamposBase = memo(function CamposBase({ districts, streets }: { districts: CityDistrict[]; streets: CityStreet[] }) {
  const { trees, graves } = useMemo(() => {
    const campos = districts.filter((d) => d.layer === 'campos');
    const roads = streets.filter((s) => s.layer === 'campos').map((s) => s.path);
    const cemetery = campos.find((d) => d.kind === 'Cemitério');
    return {
      trees: buildTrees([...campos.map((d) => d.shape), CAMPOS.hill, ...CAMPOS.cliffs], roads),
      graves: cemetery ? buildGraves(cemetery.shape) : [],
    };
  }, [districts, streets]);
  return (
    <g className={styles.camposBase} aria-hidden="true">
      <rect x="-3000" y="-3000" width="7600" height="7000" className={styles.land} />
      <rect x="-3000" y="-3000" width="7600" height="7000" fill="url(#pc-paper)" />
      {/* Curvas de nível */}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx="1300" cy="300" rx={120 + i * 70} ry={70 + i * 45} className={styles.contour} />
      ))}
      {[0, 1, 2].map((i) => (
        <ellipse key={`b${i}`} cx="330" cy="760" rx={90 + i * 60} ry={50 + i * 34} className={styles.contour} />
      ))}
      <path d={toPath(CAMPOS.sea, true)} className={styles.water} />
      <path d={toPath(CAMPOS.sea, true)} fill="url(#pc-water)" />
      {[0, 1, 2].map((i) => (
        <path key={i} className={styles.wave} d={`M${980 + i * 30} ${905 + i * 26}Q1100 ${860 + i * 26} 1220 ${875 + i * 26}T1480 ${830 + i * 26}T1640 ${790 + i * 26}`} />
      ))}
      {CAMPOS.cliffs.map((c, i) => (
        <g key={i}>
          <path d={toPath(c, true)} className={styles.cliff} />
          <path d={toPath(c, true)} fill="url(#pc-rock)" />
        </g>
      ))}
      <path d={toPath(CAMPOS.hill, true)} className={styles.hill} />
      <path d={toPath(CAMPOS.hill, true)} fill="url(#pc-rock)" />
      {trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} className={styles.tree} />
      ))}
      {graves.map(([x, y], i) => (
        <path key={i} className={styles.grave} d={`M${x} ${y - 4}V${y + 4}M${x - 2.6} ${y - 1.4}H${x + 2.6}`} />
      ))}
      <text x="560" y="80" className={styles.waterLabel}>
        MATA DOS CAMPOS
      </text>
      <text x="1250" y="950" className={styles.waterLabel}>
        MAR
      </text>
    </g>
  );
});

/* ── Registros editáveis ─────────────────────────────────────── */

interface LevelProps {
  layer: CityLayerId;
  active: boolean;
  districts: CityDistrict[];
  streets: CityStreet[];
  places: CityPlace[];
  selected?: EntityKey;
  hovered?: EntityKey;
  pick: (key: EntityKey) => void;
  onHover: (h: Hover | null, e?: RPointerEvent) => void;
  /** Malha e quadras desenhadas sob as ruas (só na camada principal). */
  base?: ReactNode;
}

function CityLevel({ layer, active, districts, streets, places, selected, hovered, pick, onHover, base }: LevelProps) {
  const ds = districts.filter((d) => d.layer === layer);
  const ss = streets.filter((s) => s.layer === layer);
  const ps = places.filter((p) => p.layer === layer);

  const hoverProps = (key: EntityKey, label: string, kind: string) =>
    active
      ? {
          onPointerEnter: (e: RPointerEvent) => onHover({ key, label, kind }, e),
          onPointerMove: (e: RPointerEvent) => onHover({ key, label, kind }, e),
          onPointerLeave: () => onHover(null),
          onClick: (e: RMouseEvent) => {
            e.stopPropagation();
            pick(key);
          },
        }
      : {};

  const flag = (key: EntityKey) => ({
    'data-selected': selected === key || undefined,
    'data-hover': hovered === key || undefined,
  });

  return (
    <g data-interactive={active || undefined}>
      {/* Áreas */}
      {ds.map((d) => {
        const key: EntityKey = `district:${d.id}`;
        return (
          <path
            key={d.id}
            d={toPath(d.shape, true)}
            className={styles.area}
            data-tone={d.tone ?? 'neutro'}
            {...flag(key)}
            {...hoverProps(key, d.name, d.kind)}
          />
        );
      })}

      {base}

      <CamposRoads streets={ss} />

      {/* Linhas */}
      {ss.map((s) => {
        const key: EntityKey = `street:${s.id}`;
        const d = toPath(s.path);
        return (
          <g key={s.id} className={styles.street} data-kind={s.kind} data-canonical={s.canonical || undefined} {...flag(key)}>
            <path d={d} className={styles.streetCase} />
            <path d={d} className={styles.streetLine} />
            {s.kind === 'via elevada' && <path d={d} className={styles.streetTies} />}
            <path id={`pc-street-${s.id}`} d={d} className={styles.streetHit} {...hoverProps(key, s.name, s.canonical ? 'Via canônica' : s.kind)} />
          </g>
        );
      })}
      {ss.map((s) => (
        <text key={s.id} className={styles.streetLabel} data-canonical={s.canonical || undefined} data-kind={s.kind} aria-hidden="true">
          <textPath href={`#pc-street-${s.id}`} startOffset="50%" textAnchor="middle">
            {s.name}
          </textPath>
        </text>
      ))}

      {/* Nomes dos bairros */}
      {ds.map((d) => {
        const [x, y] = d.labelAt ?? centroid(d.shape);
        const b = bounds(d.shape);
        // Áreas pequenas ganham nome menor
        const fs = Math.max(0.45, Math.min(1, (b.x1 - b.x0) / (d.name.length * 21)));
        return (
          <text
            key={d.id}
            x={x}
            y={y}
            className={styles.areaLabel}
            data-tone={d.tone ?? 'neutro'}
            style={{ '--fs': fs.toFixed(2) } as CSSProperties}
            aria-hidden="true"
          >
            {d.name}
          </text>
        );
      })}

      {/* Pontos */}
      {ps.map((p) => {
        const key: EntityKey = `place:${p.id}`;
        return (
          <g key={p.id} transform={`translate(${p.at[0]} ${p.at[1]})`} className={styles.place} data-icon={p.icon ?? 'ponto'} {...flag(key)}>
            <g className={styles.placeBody} {...hoverProps(key, p.name, p.kind)}>
              <circle r="15" className={styles.placeHit} />
              {p.leadsTo && <circle r="13" className={styles.placePulse} />}
              <rect x="-8.5" y="-8.5" width="17" height="17" className={styles.placeFrame} />
              <PlaceIcon name={p.icon ?? 'ponto'} />
              <text x="14" y="4" className={styles.placeLabel}>
                {p.name}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Malha e quadras de PYM-City. */
const PymBlocks = memo(function PymBlocks({ city }: { city: CityContent }) {
  const blocks = useMemo(() => buildBlocks(city.districts, city.streets), [city]);
  const grid = useMemo(() => gridPath(), []);
  return (
    <g className={styles.blocks} aria-hidden="true">
      <clipPath id="pc-island-clip">
        <path d={toPath(ISLAND, true)} />
      </clipPath>
      <path d={grid} className={styles.grid} clipPath="url(#pc-island-clip)" />
      {blocks.map((b) => (
        <path key={b.tone} d={b.d} className={styles.block} data-tone={b.tone} />
      ))}
      <Park />
    </g>
  );
});

/* ── Ascent City ─────────────────────────────────────────────── */

const AscentBase = memo(function AscentBase({ districts, streets }: { districts: CityDistrict[]; streets: CityStreet[] }) {
  const trees = useMemo(() => {
    const roads = streets.filter((s) => s.kind === 'estrada').map((s) => s.path);
    const areas = districts.filter((d) => d.shape.some(([x]) => x > CITY.x1)).map((d) => d.shape);
    return ascentTrees(areas, roads);
  }, [districts, streets]);
  const { x0, y0, x1, y1 } = CITY;
  return (
    <g className={styles.base} aria-hidden="true">
      <rect x="-3000" y="-3000" width="7600" height="7000" className={styles.water} />
      <rect x="-3000" y="-3000" width="7600" height="7000" fill="url(#pc-water)" />
      <path d={toPath(LAND, true)} className={styles.land} />
      <path d={toPath(LAND, true)} fill="url(#pc-paper)" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx="1400" cy="290" rx={90 + i * 60} ry={60 + i * 42} className={styles.contour} />
      ))}
      {[0, 1, 2].map((i) => (
        <ellipse key={`b${i}`} cx="1460" cy="900" rx={70 + i * 50} ry={45 + i * 30} className={styles.contour} />
      ))}
      <path d={toPath(LAKE, true)} className={styles.pond} />
      <path d={RIVER} className={styles.river} />
      {trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} className={styles.tree} />
      ))}
      <rect x={x0 - 6} y={y0 - 6} width={x1 - x0 + 12} height={y1 - y0 + 12} className={styles.island} />
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="url(#pc-paper)" />
      <rect x={CANAL.x0} y={CANAL.y0} width={CANAL.x1 - CANAL.x0} height={CANAL.y1 - CANAL.y0} className={styles.water} />
      <rect x={CANAL.x0} y={CANAL.y0} width={CANAL.x1 - CANAL.x0} height={CANAL.y1 - CANAL.y0} fill="url(#pc-water)" />
      <text x="300" y="520" className={styles.waterLabel}>
        MAR
      </text>
      <text x="1235" y="625" className={styles.waterLabel}>
        LAGO
      </text>
    </g>
  );
});

/** Malha, quadras, praças e o píer de Ascent City. */
const AscentBlocks = memo(function AscentBlocks({ city }: { city: CityContent }) {
  const blocks = useMemo(() => ascentBlocks(city.districts), [city]);
  const grid = useMemo(() => ascentGrid(), []);
  const { norte, praca, jardim } = PARKS;
  const bankTrees = useMemo(() => {
    const out: Pt[] = [];
    for (let y = CANAL.y0 + 30; y < CITY.y1 - 10; y += 38) {
      if (BRIDGES.some((b) => Math.abs(b - y) < 20)) continue;
      out.push([822, y], [883, y + 18]);
    }
    return out;
  }, []);
  return (
    <g className={styles.blocks} aria-hidden="true">
      <path d={grid} className={styles.grid} />
      {BRIDGES.map((y) => (
        <rect key={y} x={CANAL.x0 - 2} y={y - 7} width={CANAL.x1 - CANAL.x0 + 4} height="14" className={styles.bridge} />
      ))}
      {blocks.map((b) => (
        <path key={b.tone} d={b.d} className={styles.block} data-tone={b.tone} />
      ))}
      <rect x={norte.x} y={norte.y} width={norte.w} height={norte.h} className={styles.parkLawn} />
      <path className={styles.parkPath} d={`M${norte.x} ${norte.y + norte.h / 2}H${norte.x + norte.w}M${norte.x + norte.w / 2} ${norte.y}V${norte.y + norte.h}`} />
      <circle cx={norte.x + norte.w / 2} cy={norte.y + norte.h / 2} r="12" className={styles.pond} />
      <rect x={jardim.x} y={jardim.y} width={jardim.w} height={jardim.h} className={styles.parkLawn} />
      <rect x={praca.x} y={praca.y} width={praca.w} height={praca.h} className={styles.plaza} />
      <circle cx={praca.x + praca.w / 2} cy={praca.y + praca.h / 2} r="44" className={styles.plazaRing} />
      <circle cx={praca.x + praca.w / 2} cy={praca.y + praca.h / 2} r="20" className={styles.plazaRing} />
      {[...Array(14)].map((_, i) => {
        const p = i < 8 ? norte : jardim;
        const k = i < 8 ? i : i - 8;
        return <circle key={i} cx={p.x + 14 + ((k * 47) % (p.w - 28))} cy={p.y + 14 + ((k * 31) % (p.h - 28))} r={6 + (k % 3)} className={styles.parkTree} />;
      })}
      {bankTrees.map(([x, y], i) => (
        <circle key={`t${i}`} cx={x} cy={y} r="5" className={styles.parkTree} />
      ))}
      <rect x={PIER.x} y={PIER.y} width={PIER.w} height={PIER.h} className={styles.plaza} />
      <circle cx={PIER.x + 30} cy={PIER.y + 17} r="14" className={styles.wheel} />
      <path className={styles.wheel} d={`M${PIER.x + 16} ${PIER.y + 17}H${PIER.x + 44}M${PIER.x + 30} ${PIER.y + 3}V${PIER.y + 31}`} />
    </g>
  );
});

function Park() {
  const { x, y, w, h } = PARK;
  return (
    <g className={styles.park}>
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} className={styles.parkLawn} />
      <path className={styles.parkPath} d={`M${x + 6} ${y + 6}L${x + w - 6} ${y + h - 6}M${x + w - 6} ${y + 6}L${x + 6} ${y + h - 6}`} />
      <ellipse cx={x + 90} cy={y + 130} rx="46" ry="34" className={styles.pond} />
      <ellipse cx={x + 205} cy={y + 60} rx="32" ry="22" className={styles.pond} />
      {Array.from({ length: 22 }, (_, i) => {
        const tx = x + 18 + ((i * 53) % (w - 36));
        const ty = y + 16 + ((i * 37) % (h - 32));
        return <circle key={i} cx={tx} cy={ty} r={5 + (i % 3)} className={styles.parkTree} />;
      })}
    </g>
  );
}

function CamposRoads({ streets }: { streets: CityStreet[] }): ReactNode {
  return (
    <g aria-hidden="true">
      {streets
        .filter((s) => s.kind === 'estrada')
        .map((s) => (
          <path key={s.id} d={toPath(s.path)} className={styles.dirtRoad} style={{ '--w': '18px' } as CSSProperties} />
        ))}
    </g>
  );
}
