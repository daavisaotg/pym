import { useMemo, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import type { CityContent, Pt } from '@/data/city';
import { CAMPOS, ISLAND, toPath } from '@/pages/map/city/geometry';
import { dotPath, project, WORLD } from '@/pages/map/world/landmass';
import { useEditorEnv } from './context';
import { CANAL, CITY, LAKE, LAND } from '@/pages/map/city/ascent';
import styles from './Admin.module.css';

type Rec = Record<string, unknown>;

function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }): [number, number] {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  const r = p.matrixTransform(svg.getScreenCTM()!.inverse());
  return [r.x, r.y];
}

const isPt = (v: unknown): v is Pt => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number');

/**
 * Editor visual de geometria do mapa de PYM-City: arraste os pontos, clique no mapa
 * para mover (ponto) ou acrescentar vértices (linha e área), duplo clique num vértice para apagá-lo.
 */
export function GeoField({ mode, value, record, onChange }: { mode: 'point' | 'path' | 'polygon'; value: unknown; record: Rec; onChange: (v: unknown) => void }) {
  const city = useEditorEnv().city as CityContent | undefined;
  const layer = (record.layer as string) || 'cidade';
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const pts: Pt[] = mode === 'point' ? (isPt(value) ? [value] : []) : Array.isArray(value) ? (value as unknown[]).filter(isPt) : [];
  const commit = (next: Pt[]) => onChange(mode === 'point' ? next[0] : next);
  const round = ([x, y]: [number, number]): Pt => [Math.round(x), Math.round(y)];

  const others = useMemo(() => {
    if (!city) return { areas: [], lines: [], dots: [] };
    const self = record.id;
    return {
      areas: city.districts.filter((d) => d.layer === layer && d.id !== self),
      lines: city.streets.filter((s) => s.layer === layer && s.id !== self),
      dots: city.places.filter((p) => p.layer === layer && p.id !== self),
    };
  }, [city, layer, record.id]);

  const onBgClick = (e: RMouseEvent<SVGRectElement>) => {
    if (!svgRef.current) return;
    const p = round(svgPoint(svgRef.current, e));
    if (mode === 'point') commit([p]);
    else commit([...pts, p]);
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const p = round(svgPoint(svgRef.current, e));
    setCursor(p);
    if (drag === null) return;
    commit(pts.map((q, i) => (i === drag ? p : q)));
  };

  const campos = layer === 'campos';

  return (
    <div className={styles.geo}>
      <svg
        ref={svgRef}
        viewBox="0 0 1600 1000"
        className={styles.geoSvg}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => {
          setDrag(null);
          setCursor(null);
        }}
      >
        <rect x="0" y="0" width="1600" height="1000" className={styles.geoWater} />
        {city?.layout === 'ascent' ? (
          <g pointerEvents="none">
            <path d={toPath(LAND, true)} className={styles.geoLand} />
            <rect x={CITY.x0} y={CITY.y0} width={CITY.x1 - CITY.x0} height={CITY.y1 - CITY.y0} className={styles.geoOther} />
            <rect x={CANAL.x0} y={CANAL.y0} width={CANAL.x1 - CANAL.x0} height={CANAL.y1 - CANAL.y0} className={styles.geoWater} />
            <path d={toPath(LAKE, true)} className={styles.geoWater} />
          </g>
        ) : campos ? (
          <g pointerEvents="none">
            <rect x="0" y="0" width="1600" height="1000" className={styles.geoLand} />
            <path d={toPath(CAMPOS.sea, true)} className={styles.geoWater} />
            <path d={toPath(CAMPOS.hill, true)} className={styles.geoOther} />
            {CAMPOS.cliffs.map((c, i) => (
              <path key={i} d={toPath(c, true)} className={styles.geoOther} />
            ))}
          </g>
        ) : (
          <path d={toPath(ISLAND, true)} className={styles.geoLand} pointerEvents="none" />
        )}
        <g pointerEvents="none">
          {others.areas.map((d) => (
            <path key={d.id} d={toPath(d.shape, true)} className={styles.geoOther} />
          ))}
          {others.lines.map((s) => (
            <path key={s.id} d={toPath(s.path)} className={styles.geoOtherLine} />
          ))}
          {others.dots.map((p) => (
            <circle key={p.id} cx={p.at[0]} cy={p.at[1]} r="5" className={styles.geoOtherDot} />
          ))}
        </g>
        {/* Clique dentro da ilha também conta */}
        <rect x="0" y="0" width="1600" height="1000" fill="transparent" onClick={onBgClick} />
        {mode !== 'point' && pts.length > 1 && (
          <path d={toPath(pts, mode === 'polygon')} className={mode === 'polygon' ? styles.geoShape : styles.geoLine} pointerEvents="none" />
        )}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p[0]}
              cy={p[1]}
              r={mode === 'point' ? 13 : 10}
              className={styles.geoHandle}
              data-active={drag === i || undefined}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setDrag(i);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const min = mode === 'polygon' ? 3 : mode === 'path' ? 2 : 1;
                if (pts.length > min) commit(pts.filter((_, j) => j !== i));
              }}
            />
            {mode !== 'point' && (
              <text x={p[0]} y={p[1] - 16} className={styles.geoNo}>
                {i + 1}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className={styles.geoBar}>
        <span className="code">
          {cursor ? `x ${cursor[0]} · y ${cursor[1]}` : `${pts.length} ${pts.length === 1 ? 'ponto' : 'pontos'}`} · camada {layer}
        </span>
        <span>
          {mode === 'point' ? 'Clique no mapa ou arraste o marcador.' : 'Clique para acrescentar um ponto, arraste para mover, duplo clique apaga.'}
        </span>
        {mode !== 'point' && pts.length > (mode === 'polygon' ? 3 : 2) && (
          <button type="button" className={styles.small} onClick={() => commit(pts.slice(0, -1))}>
            Desfazer último ponto
          </button>
        )}
      </div>
    </div>
  );
}

/** Posição no mapa-múndi do modo Explorar, em [longitude, latitude]. */
export function LonLatField({ value, onChange }: { value: unknown; record: Rec; onChange: (v: unknown) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dots = useMemo(() => dotPath(2, 3.4), []);
  const [drag, setDrag] = useState(false);
  const ll: [number, number] = isPt(value) ? value : [0, 0];
  const [x, y] = project(ll);
  const k = WORLD.w / 360;
  const set = (e: { clientX: number; clientY: number }) => {
    if (!svgRef.current) return;
    const [px, py] = svgPoint(svgRef.current, e);
    const lon = Math.max(-180, Math.min(180, px / k - 180));
    const lat = Math.max(-60, Math.min(80, WORLD.north - py / k));
    onChange([Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
  };
  return (
    <div className={styles.geo}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
        className={styles.geoSvg}
        onClick={set}
        onPointerMove={(e) => drag && set(e)}
        onPointerUp={() => setDrag(false)}
        onPointerLeave={() => setDrag(false)}
      >
        <rect width={WORLD.w} height={WORLD.h} className={styles.geoWater} />
        <path d={dots} className={styles.geoDots} />
        <circle cx={x} cy={y} r="11" className={styles.geoHandle} onPointerDown={() => setDrag(true)} />
      </svg>
      <div className={styles.geoBar}>
        <span className="code">
          lon {ll[0]} · lat {ll[1]}
        </span>
        <span>Clique no mapa ou arraste o marcador.</span>
      </div>
    </div>
  );
}
