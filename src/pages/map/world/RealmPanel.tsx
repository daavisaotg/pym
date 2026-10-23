import type { Realm } from '@/data/city';
import { LoreBody } from '@/components/lore/LoreBody';
import { Link } from '@/router/router';
import panel from '../../multiverse/Panel.module.css';
import { Facts, Gallery, NameOrLink, Related } from '../parts';
import styles from '../MapPanel.module.css';

const fmt = ([lon, lat]: [number, number]) =>
  `${Math.abs(lat).toFixed(1).replace('.', ',')}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(1).replace('.', ',')}° ${lon >= 0 ? 'L' : 'O'}`;

/** Ficha de um país, reino ou lugar do modo Explorar. */
export function RealmPanel({ realm }: { realm: Realm }) {
  return (
    <>
      <header className={panel.head}>
        <span className={`${panel.code} code`}>{fmt(realm.coords)}</span>
        <h2 className={panel.title}>{realm.name}</h2>
        <p className={styles.kind}>
          {realm.kind} · {realm.region}
        </p>
        {realm.reference && <span className={styles.refStamp}>Referência do cânone</span>}
      </header>
      <p className={styles.lead}>{realm.summary}</p>
      {realm.link && (
        <Link to={realm.link.href} className={styles.goLayer}>
          <span className="code">ARQUIVO</span>
          {realm.link.label}
        </Link>
      )}
      <Gallery images={realm.images} alt={realm.name} />
      {(realm.ruler || realm.capital) && (
        <dl className={panel.facts}>
          {realm.ruler && (
            <div>
              <dt>Governo</dt>
              <dd>
                <NameOrLink value={realm.ruler} />
              </dd>
            </div>
          )}
          {realm.capital && (
            <div>
              <dt>Capital</dt>
              <dd>{realm.capital}</dd>
            </div>
          )}
        </dl>
      )}
      <LoreBody blocks={realm.body} />
      <Facts facts={realm.facts} />
      {realm.reference && (
        <p className={styles.refNote}>
          Esta ficha usa o cânone dos quadrinhos e ainda não tem lore própria do PYM. A staff pode reescrevê-la em{' '}
          <code>world.json</code>.
        </p>
      )}
      <Related items={realm.related} />
    </>
  );
}
