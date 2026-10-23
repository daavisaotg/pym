import styles from './MapControls.module.css';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

/** Botões de aproximar, afastar e recentrar, no canto inferior direito do mapa. */
export function MapControls({ onZoomIn, onZoomOut, onReset }: Props) {
  return (
    <div className={styles.controls} role="group" aria-label="Controles do mapa">
      <button type="button" onClick={onZoomIn} aria-label="Aproximar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Afastar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button type="button" onClick={onReset} aria-label="Recentrar o mapa">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="6.5" />
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
        </svg>
      </button>
    </div>
  );
}
