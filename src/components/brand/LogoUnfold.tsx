import type { CSSProperties } from 'react';
import { asset } from '@/lib/asset';
import styles from './LogoUnfold.module.css';

interface Props {
  /** Quando verdadeiro, as abas se abrem. Antes disso ficam dobradas. */
  play: boolean;
  className?: string;
}

/**
 * O logo do PYM já é um papel dobrado em três abas.
 * Aqui ele se abre como uma pasta de arquivo: a aba central surge e as
 * laterais giram nas dobras. É o único momento de entrada orquestrado do site.
 */
/** URL absoluta: variáveis CSS com url() seriam resolvidas a partir do arquivo .css. */
const maskUrl = () => new URL(asset('brand/pym-logo.png')!, document.baseURI).href;

export function LogoUnfold({ play, className }: Props) {
  return (
    <div className={[styles.stage, className].filter(Boolean).join(' ')} data-play={play || undefined}>
      <div
        className={styles.logo}
        role="img"
        aria-label="Logo do PYM"
        style={{ '--logo-mask': `url(${maskUrl()})` } as CSSProperties}
      >
        <img className={`${styles.panel} ${styles.p}`} src={asset('brand/pym-panel-p.png')} alt="" width={244} height={452} />
        <img className={`${styles.panel} ${styles.y}`} src={asset('brand/pym-panel-y.png')} alt="" width={294} height={452} />
        <img className={`${styles.panel} ${styles.m}`} src={asset('brand/pym-panel-m.png')} alt="" width={238} height={452} />
        <span className={styles.sheen} aria-hidden="true" />
      </div>
    </div>
  );
}
