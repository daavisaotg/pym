import { useEffect, useMemo, useRef, useState } from 'react';
import type { Realm } from '@/data/city';
import { usePanZoom, type Inset, type Pad } from '../usePanZoom';
import { MapControls } from '../MapControls';
import { dotPath, project, WORLD } from './landmass';
import styles from './WorldMap.module.css';

interface Props {
  realms: Realm[];
  selected?: string;
  onSelect: (slug: string | null) => void;
  inset: Inset;
  pad?: Pad;
  focusNonce: number;
}

/** Arco entre dois pontos, curvado para cima como uma rota aérea. */
function arc(a: [number, number], b: [number, number]) {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return `M${a[0]} ${a[1]}Q${mx} ${my - d * 0.28} ${b[0]} ${b[1]}`;
}

export function WorldMap({ realms, selected, onSelect, inset, pad, focusNonce }: Props) {
  const pz = usePanZoom({ board: WORLD, inset, pad, portraitFill: 0.5, maxZoom: 9 });
  const dots = useMemo(() => dotPath(1.4, 2.5), []);
  const [hover, setHover] = useState<string | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const home = realms.find((r) => r.id === 'pym-city') ?? realms[0];
  const current = realms.find((r) => r.slug === selected);

  useEffect(() => {
    if (!current) return;
    pz.focus(project(current.coords), 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  const graticule = useMemo(() => {
    const parts: string[] = [];
    for (let lon = -150; lon <= 150; lon += 30) {
      const [x] = project([lon, 0]);
      parts.push(`M${x} 0V${WORLD.h}`);
    }
    for (let lat = 60; lat >= -45; lat -= 30) {
      const [, y] = project([0, lat]);
      parts.push(`M0 ${y}H${WORLD.w}`);
    }
    return parts.join('');
  }, []);
  const [, equator] = project([0, 0]);

  return (
    <div ref={stageRef} className={styles.stage} data-native-scroll>
      <svg ref={pz.svgRef} className={styles.svg} role="application" aria-label="Mapa-múndi da Terra-001" data-zoom="far">
        <defs>
          <filter id="w-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="-5000" y="-5000" width="12000" height="12000" fill="transparent" onClick={() => !pz.wasDrag() && onSelect(null)} />
        <g ref={pz.gRef}>
          <rect x="0" y="0" width={WORLD.w} height={WORLD.h} className={styles.frame} />
          <path d={graticule} className={styles.graticule} />
          <path d={`M0 ${equator}H${WORLD.w}`} className={styles.equator} />
          <text x="8" y={equator - 5} className={styles.gridLabel}>
            EQUADOR 0°
          </text>
          <path d={dots} className={styles.land} />
          <rect x="0" y="0" width={WORLD.w} height="3" className={styles.scan} />

          {home && current && current.id !== home.id && (
            <path key={current.id} d={arc(project(home.coords), project(current.coords))} className={styles.route} />
          )}

          {realms.map((r) => {
            const [x, y] = project(r.coords);
            const isSel = r.slug === selected;
            return (
              <g
                key={r.id}
                transform={`translate(${x} ${y})`}
                className={styles.realm}
                data-selected={isSel || undefined}
                data-hover={hover === r.id || undefined}
                data-home={r.id === home?.id || undefined}
                data-reference={r.reference || undefined}
              >
                <g
                  className={styles.realmBody}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!pz.wasDrag()) onSelect(r.slug);
                  }}
                  onPointerEnter={(e) => {
                    setHover(r.id);
                    const rect = stageRef.current!.getBoundingClientRect();
                    if (tipRef.current) tipRef.current.style.transform = `translate(${e.clientX - rect.left + 14}px, ${e.clientY - rect.top + 14}px)`;
                  }}
                  onPointerLeave={() => setHover(null)}
                >
                  <circle r="16" className={styles.hit} />
                  <circle r="11" className={styles.pulse} />
                  <circle r="4.5" className={styles.core} />
                  <path d="M-9 0H-6M6 0H9M0 -9V-6M0 6V9" className={styles.cross} />
                  <text
                    x={r.labelSide === 'left' ? -12 : r.labelSide === 'below' ? 0 : 12}
                    y={r.labelSide === 'below' ? 24 : -8}
                    textAnchor={r.labelSide === 'left' ? 'end' : r.labelSide === 'below' ? 'middle' : 'start'}
                    className={styles.label}
                  >
                    {r.name}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
      <div ref={tipRef} className={styles.tip} data-show={hover ? '' : undefined} aria-hidden="true">
        {hover && realms.find((r) => r.id === hover)?.region}
      </div>
      <MapControls onZoomIn={() => pz.zoomAt(1.5)} onZoomOut={() => pz.zoomAt(1 / 1.5)} onReset={() => pz.reset()} />
    </div>
  );
}
