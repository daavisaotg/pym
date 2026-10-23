import type { CityContent, CityLayerId } from '@/data/city';
import type { EntityKey } from './CityMap';
import styles from './CityIndex.module.css';

interface Props {
  city: CityContent;
  onSelect: (key: EntityKey) => void;
  onLayer: (layer: CityLayerId) => void;
}

/** Registro escrito da cidade, abaixo do mapa: tudo que está no mapa, por camada. */
export function CityIndex({ city, onSelect, onLayer }: Props) {
  const canonical = city.streets.filter((s) => s.canonical && !s.draft);
  return (
    <section className={`container ${styles.index}`} aria-labelledby="registro-cidade">
      <header className={styles.head}>
        <p className={`${styles.kicker} code`}>ARQUIVO {city.code}</p>
        <h2 id="registro-cidade" className={styles.h2}>
          Registro de {city.name}
        </h2>
        <p className={styles.intro}>{city.summary}</p>
      </header>

      {canonical.length > 0 && (
      <div className={styles.canon}>
        <h3 className={styles.canonTitle}>Ruas canônicas</h3>
        <ul>
          {canonical.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onSelect(`street:${s.id}`)}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      )}

      <ol className={styles.layers}>
        {city.layers.map((l) => {
          const districts = city.districts.filter((d) => d.layer === l.id && !d.draft);
          const streets = city.streets.filter((s) => s.layer === l.id && !s.draft);
          const places = city.places.filter((p) => p.layer === l.id && !p.draft);
          return (
            <li key={l.id} className={styles.layer} data-layer={l.id}>
              <div className={styles.layerHead}>
                <span className={`${styles.level} code`}>{l.level}</span>
                <h3 className={styles.layerName}>
                  <button type="button" onClick={() => onLayer(l.id)}>
                    {l.name}
                  </button>
                </h3>
                <p className={styles.layerSummary}>{l.summary}</p>
              </div>
              <div className={styles.cols}>
                {[
                  { title: 'Áreas', items: districts.map((d) => ({ key: `district:${d.id}` as EntityKey, name: d.name, kind: d.kind })) },
                  { title: 'Vias', items: streets.map((s) => ({ key: `street:${s.id}` as EntityKey, name: s.name, kind: s.canonical ? 'Canônica' : s.kind })) },
                  { title: 'Locais', items: places.map((p) => ({ key: `place:${p.id}` as EntityKey, name: p.name, kind: p.kind })) },
                ]
                  .filter((c) => c.items.length)
                  .map((c) => (
                    <div key={c.title}>
                      <h4 className={styles.colTitle}>{c.title}</h4>
                      <ul className={styles.items}>
                        {c.items.map((it) => (
                          <li key={it.key}>
                            <button type="button" onClick={() => onSelect(it.key)}>
                              <span>{it.name}</span>
                              <small>{it.kind}</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
