import { useId } from 'react';
import { asset } from '@/lib/asset';
import styles from './Seal.module.css';

/** Selo do arquivo: Anthony no centro, cercado pelo nome do arquivo em círculo. */
export function Seal({ size = 120 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={styles.seal} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path id={`ring-${id}`} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="60" cy="60" r="57" className={styles.outer} />
      <circle cx="60" cy="60" r="35" className={styles.inner} />
      <text className={styles.text}>
        <textPath href={`#ring-${id}`} startOffset="0">
          ARQUIVO DO MULTIVERSO ★ PYM ★ DATABASE ★
        </textPath>
      </text>
      <image href={asset('brand/anthony.png')} x="40" y="38" width="40" height="45" />
    </svg>
  );
}
