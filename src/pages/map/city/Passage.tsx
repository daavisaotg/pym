import styles from './Passage.module.css';

export type PassageKind = 'tunel-ida' | 'tunel-volta' | 'subir' | 'descer';

const text: Record<PassageKind, [string, string]> = {
  'tunel-ida': ['ATRAVESSANDO O TÚNEL', 'Rumo aos Campos'],
  'tunel-volta': ['ATRAVESSANDO O TÚNEL', 'De volta a PYM-City'],
  subir: ['SUBINDO', 'Cidade Superior'],
  descer: ['DESCENDO', 'Inferioridade'],
};

/** Transição entre camadas: túnel (luzes passando) ou elevador (linhas de nível). */
export function Passage({ kind, label }: { kind: PassageKind; label?: string }) {
  const [head, sub] = text[kind];
  const tunnel = kind.startsWith('tunel');
  return (
    <div className={styles.passage} data-kind={tunnel ? 'tunel' : kind} aria-hidden="true">
      {tunnel ? (
        <div className={styles.tunnel}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={styles.ring} style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      ) : (
        <div className={styles.shaft}>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={styles.floor} style={{ animationDelay: `${i * 55}ms` }} />
          ))}
        </div>
      )}
      <p className={styles.caption}>
        <span className="code">{head}</span>
        <strong>{label ?? sub}</strong>
      </p>
    </div>
  );
}
