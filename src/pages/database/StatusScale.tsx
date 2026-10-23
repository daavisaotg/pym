import { useState } from 'react';
import { attributes, describeTier, scaleIntro, scaleWarning, tiers } from '@/data/status';
import styles from './Database.module.css';

/** Referência pública da escala de status, com o texto oficial do servidor. */
export function StatusScale() {
  const described = attributes.filter((a) => a.descriptions);
  const [attr, setAttr] = useState<string>('geral');

  return (
    <section id="escala" className={styles.scale} aria-labelledby="escala-titulo">
      <header className={styles.scaleHead}>
        <div>
          <h2 id="escala-titulo" className={styles.h2}>
            Escala de status
          </h2>
          <p className={styles.scaleIntro}>{scaleIntro}</p>
        </div>
        <div className={styles.chips} role="radiogroup" aria-label="Atributo">
          <button type="button" role="radio" aria-checked={attr === 'geral'} className={styles.chip} onClick={() => setAttr('geral')}>
            Geral
          </button>
          {described.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={attr === a.id} className={styles.chip} onClick={() => setAttr(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </header>

      <ol className={styles.tiers}>
        {tiers.map((t) => (
          <li key={t.id} className={styles.tierRow} data-group={t.group}>
            <span className={styles.tierMeter} aria-hidden="true">
              {tiers.map((s) => (
                <span key={s.id} data-on={s.level <= t.level || undefined} data-group={s.group} />
              ))}
            </span>
            <span className={styles.tierName}>
              {t.label}
              {t.restricted && <span className={styles.tierRestricted}>{t.restricted}</span>}
            </span>
            <span className={styles.tierText}>{attr === 'geral' ? t.general : describeTier(attr, t.id)}</span>
          </li>
        ))}
      </ol>

      <p className={styles.warning}>{scaleWarning}</p>
      <p className={styles.scaleNote}>Durabilidade, resistência e os demais atributos seguem a mesma escala.</p>
    </section>
  );
}
