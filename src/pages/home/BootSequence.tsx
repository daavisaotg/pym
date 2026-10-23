import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { prefersReducedMotion } from '@/lib/asset';
import styles from './BootSequence.module.css';

const LINES = ['Conectando ao Arquivo do Multiverso', 'Identificando visitante', 'Acesso público concedido'];
const STORAGE_KEY = 'pym:boot-seen';

/** Só roda na primeira visita da sessão e pode ser pulada com clique ou tecla. */
export function shouldBoot(): boolean {
  if (prefersReducedMotion()) return false;
  try {
    return !sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* navegação privada: ignora */
    }

    const timers = [
      setTimeout(() => setStep(1), 380),
      setTimeout(() => setStep(2), 760),
      setTimeout(() => setStep(3), 1140),
      setTimeout(() => setLeaving(true), 1450),
      setTimeout(onDone, 1850),
    ];

    const skip = () => {
      timers.forEach(clearTimeout);
      setLeaving(true);
      setTimeout(onDone, 300);
    };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  return createPortal(
    <div className={styles.boot} data-leaving={leaving || undefined} role="status" aria-live="polite">
      <div className={styles.box}>
        <ol className={styles.lines}>
          {LINES.map((line, i) => (
            <li key={line} className={styles.line} data-on={step > i || undefined} data-last={i === LINES.length - 1 || undefined}>
              {line}
            </li>
          ))}
        </ol>
        <div className={styles.progress}>
          <span style={{ transform: `scaleX(${step / LINES.length})` }} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
