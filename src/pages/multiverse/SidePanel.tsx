import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import styles from './Panel.module.css';

interface Props {
  /** Muda quando o conteúdo troca; reinicia a rolagem e a animação. */
  contentKey: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Painel lateral (desktop) ou folha inferior (celular) do Multiverso. */
export function SidePanel({ contentKey, label, onClose, children }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
  }, [contentKey]);

  return (
    <aside className={styles.panel} aria-label={label}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar painel">
        <Icon name="close" size={18} />
      </button>
      <div ref={bodyRef} className={styles.body} data-native-scroll key={contentKey}>
        {children}
      </div>
    </aside>
  );
}
