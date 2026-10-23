import { recordPath } from '@/app/paths';
import { useCollection, useRecordLinks, type Faction } from '@/data';
import { Link } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { FactionCrest } from '@/components/library/FactionCrest';
import type { CSSProperties } from 'react';
import styles from './Factions.module.css';

function FactionCard({ f, index }: { f: Faction; index: number }) {
  const links = useRecordLinks();
  const leader = f.leaders?.[0];
  const leaderLabel = leader ? (links.get(leader)?.label ?? leader) : undefined;
  return (
    <li>
      <Link to={recordPath.factions(f.slug)} className={styles.card} style={{ '--tone': f.color ?? '#8a0303' } as CSSProperties}>
        <span className={styles.cardCrest}>
          <FactionCrest faction={f} />
        </span>
        <span className={styles.cardBody}>
          <span className={`${styles.cardNo} code`}>FC-{String(index + 1).padStart(3, '0')}</span>
          <span className={styles.cardName}>{f.name}</span>
          {f.classification && <span className={styles.cardClass}>{f.classification}</span>}
          {f.summary && <span className={styles.cardText}>{f.summary}</span>}
          {leaderLabel && (
            <span className={styles.cardLeader}>
              <span>Liderança</span> {leaderLabel}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function FactionsPage() {
  const { data: factions, loading } = useCollection('factions');
  return (
    <div className={styles.page}>
      <Seo title="Facções" description="As organizações do universo PYM: S.H.I.E.L.D., A.I.M., HYDRA e Liga dos Assassinos." />
      <div className="container">
        <header className={styles.header}>
          <p className={`${styles.kicker} code`}>MÓDULO FC</p>
          <h1 className={styles.h1}>Facções</h1>
          <p className={styles.intro}>
            {loading ? 'Carregando dossiês…' : `${factions.length} organizações sob vigilância do arquivo.`} Agências, cientistas,
            terroristas e assassinos que movem a história por trás dos heróis.
          </p>
        </header>
        <ul className={styles.grid}>
          {factions.map((f, i) => (
            <FactionCard key={f.id} f={f} index={i} />
          ))}
        </ul>
      </div>
    </div>
  );
}
