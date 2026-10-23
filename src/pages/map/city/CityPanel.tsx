import type { CityContent, CityLayer, CityLayerId, Pt } from '@/data/city';
import { LoreBody } from '@/components/lore/LoreBody';
import panel from '../../multiverse/Panel.module.css';
import { Block, Facts, Gallery, NameOrLink, Related } from '../parts';
import { pointInPolygon } from './geometry';
import type { EntityKey } from './CityMap';
import styles from '../MapPanel.module.css';

interface Props {
  city: CityContent;
  entity: EntityKey;
  onSelect: (key: EntityKey) => void;
  onLayer: (layer: CityLayerId) => void;
  /** Vai para outra cidade (id) */
  onCity?: (id: string) => void;
  cityName?: (id: string) => string | undefined;
}

const streetKind: Record<string, string> = {
  rua: 'Rua',
  avenida: 'Avenida',
  'via elevada': 'Via elevada',
  túnel: 'Túnel',
  estrada: 'Estrada',
  galeria: 'Galeria',
  beco: 'Beco',
  trilha: 'Trilha',
};

const goLabel: Record<string, string> = {
  superior: 'Subir para a Cidade Superior',
  cidade: 'Voltar para a cidade',
  inferioridade: 'Descer para a Inferioridade',
  campos: 'Atravessar o túnel',
};

/** Passa pela área? Amostra a linha a cada 8 unidades. */
function crosses(path: Pt[], shape: Pt[]) {
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 8));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      if (pointInPolygon([ax + (bx - ax) * t, ay + (by - ay) * t], shape)) return true;
    }
  }
  return false;
}

function LayerTag({ layer }: { layer?: CityLayer }) {
  if (!layer) return null;
  return (
    <span className={styles.layerTag} data-layer={layer.id}>
      {layer.level} · {layer.name}
    </span>
  );
}

/** Ficha de um bairro, rua ou local do mapa de PYM-City. */
export function CityPanel({ city, entity, onSelect, onLayer, onCity, cityName }: Props) {
  const [type, id] = entity.split(':') as ['district' | 'street' | 'place', string];
  const layerOf = (l: CityLayerId) => city.layers.find((x) => x.id === l);

  if (type === 'district') {
    const d = city.districts.find((x) => x.id === id);
    if (!d) return null;
    const places = city.places.filter((p) => !p.draft && (p.district === d.id || (p.layer === d.layer && !p.district && pointInPolygon(p.at, d.shape))));
    const streets = city.streets.filter((s) => !s.draft && s.layer === d.layer && crosses(s.path, d.shape));
    return (
      <>
        <header className={panel.head}>
          <LayerTag layer={layerOf(d.layer)} />
          <h2 className={panel.title}>{d.name}</h2>
          <p className={styles.kind}>{d.kind}</p>
        </header>
        {d.summary && <p className={styles.lead}>{d.summary}</p>}
        <Gallery images={d.images} alt={d.name} />
        {d.ruler && (
          <p className={styles.ruler}>
            <span>Quem manda</span> <NameOrLink value={d.ruler} />
          </p>
        )}
        <LoreBody blocks={d.body} />
        <Facts facts={d.facts} />
        {places.length > 0 && (
          <Block title="Locais">
            <EntityList items={places.map((p) => ({ key: `place:${p.id}` as EntityKey, name: p.name, kind: p.kind }))} onSelect={onSelect} />
          </Block>
        )}
        {streets.length > 0 && (
          <Block title="Ruas">
            <EntityList
              items={streets.map((s) => ({ key: `street:${s.id}` as EntityKey, name: s.name, kind: s.canonical ? 'Via canônica' : streetKind[s.kind], canonical: s.canonical }))}
              onSelect={onSelect}
            />
          </Block>
        )}
        <Related items={d.related} />
      </>
    );
  }

  if (type === 'street') {
    const s = city.streets.find((x) => x.id === id);
    if (!s) return null;
    const districts = city.districts.filter((d) => !d.draft && d.layer === s.layer && crosses(s.path, d.shape));
    return (
      <>
        <header className={panel.head}>
          <LayerTag layer={layerOf(s.layer)} />
          <h2 className={panel.title}>{s.name}</h2>
          <p className={styles.kind}>{streetKind[s.kind] ?? s.kind}</p>
          {s.canonical && <span className={panel.devStamp}>Via canônica</span>}
        </header>
        {s.summary && <p className={styles.lead}>{s.summary}</p>}
        <Gallery images={s.images} alt={s.name} />
        <LoreBody blocks={s.body} />
        <Facts facts={s.facts} />
        {districts.length > 0 && (
          <Block title="Passa por">
            <EntityList items={districts.map((d) => ({ key: `district:${d.id}` as EntityKey, name: d.name, kind: d.kind }))} onSelect={onSelect} />
          </Block>
        )}
        <Related items={s.related} />
      </>
    );
  }

  const p = city.places.find((x) => x.id === id);
  if (!p) return null;
  const district = city.districts.find((d) => d.id === p.district);
  return (
    <>
      <header className={panel.head}>
        <LayerTag layer={layerOf(p.layer)} />
        <h2 className={panel.title}>{p.name}</h2>
        <p className={styles.kind}>
          {p.kind}
          {district && (
            <>
              {' em '}
              <button type="button" className={styles.inline} onClick={() => onSelect(`district:${district.id}`)}>
                {district.name}
              </button>
            </>
          )}
        </p>
      </header>
      {p.summary && <p className={styles.lead}>{p.summary}</p>}
      {p.leadsTo && (
        <button type="button" className={styles.goLayer} data-to={p.leadsTo} onClick={() => onLayer(p.leadsTo!)}>
          <span className="code">ACESSO</span>
          {goLabel[p.leadsTo]}
        </button>
      )}
      {p.leadsToCity && onCity && (
        <button type="button" className={styles.goLayer} onClick={() => onCity(p.leadsToCity!)}>
          <span className="code">RODOVIA</span>
          Ir para {cityName?.(p.leadsToCity) ?? 'a outra cidade'}
        </button>
      )}
      <Gallery images={p.images} alt={p.name} />
      {p.owner && (
        <p className={styles.ruler}>
          <span>{p.ownerLabel ?? 'Responsável'}</span> <NameOrLink value={p.owner} />
        </p>
      )}
      <LoreBody blocks={p.body} />
      <Facts facts={p.facts} />
      <Related items={p.related} />
    </>
  );
}

/** Ficha da camada inteira (Superior, Cidade, Inferioridade, Campos). */
export function LayerPanel({ city, layer, onSelect }: { city: CityContent; layer: CityLayer; onSelect: (key: EntityKey) => void }) {
  const districts = city.districts.filter((d) => !d.draft && d.layer === layer.id);
  const places = city.places.filter((p) => !p.draft && p.layer === layer.id);
  const streets = city.streets.filter((s) => !s.draft && s.layer === layer.id);
  return (
    <>
      <header className={panel.head}>
        <span className={styles.layerTag} data-layer={layer.id}>
          {layer.level}
        </span>
        <h2 className={panel.title}>{layer.name}</h2>
        {layer.tagline && <p className={panel.aliases}>{layer.tagline}</p>}
      </header>
      <p className={styles.lead}>{layer.summary}</p>
      <Gallery images={layer.images} alt={layer.name} />
      {layer.ruler && (
        <p className={styles.ruler}>
          <span>{layer.rulerLabel ?? 'Quem manda'}</span> <NameOrLink value={layer.ruler} />
        </p>
      )}
      <LoreBody blocks={layer.body} />
      <Facts facts={layer.facts} />
      {districts.length > 0 && (
        <Block title="Áreas">
          <EntityList items={districts.map((d) => ({ key: `district:${d.id}` as EntityKey, name: d.name, kind: d.kind }))} onSelect={onSelect} />
        </Block>
      )}
      {places.length > 0 && (
        <Block title="Locais">
          <EntityList items={places.map((p) => ({ key: `place:${p.id}` as EntityKey, name: p.name, kind: p.kind }))} onSelect={onSelect} />
        </Block>
      )}
      {streets.length > 0 && (
        <Block title="Vias">
          <EntityList
            items={streets.map((s) => ({ key: `street:${s.id}` as EntityKey, name: s.name, kind: s.canonical ? 'Via canônica' : streetKind[s.kind], canonical: s.canonical }))}
            onSelect={onSelect}
          />
        </Block>
      )}
    </>
  );
}

interface ListItem {
  key: EntityKey;
  name: string;
  kind?: string;
  canonical?: boolean;
}

export function EntityList({ items, onSelect }: { items: ListItem[]; onSelect: (key: EntityKey) => void }) {
  return (
    <ul className={styles.entities}>
      {items.map((it) => (
        <li key={it.key}>
          <button type="button" className={styles.entity} data-canonical={it.canonical || undefined} onClick={() => onSelect(it.key)}>
            <span className={styles.entityName}>{it.name}</span>
            {it.kind && <span className={styles.entityKind}>{it.kind}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
