import { isPreview, setPreview } from '@/data/contentFiles';
import { toHref } from '@/router/router';
import styles from './PreviewBanner.module.css';

/** Aviso fixo quando o site mostra os rascunhos do painel em vez do conteúdo publicado. */
export function PreviewBanner() {
  if (!isPreview()) return null;
  const exit = () => {
    setPreview(false);
    window.location.reload();
  };
  return (
    <div className={styles.banner} role="status">
      <span className={styles.dot} />
      <span className={styles.text}>
        <strong>Prévia do rascunho.</strong> Só você vê estas alterações até publicar.
      </span>
      <a href={toHref('/admin')} className={styles.link}>
        Voltar ao painel
      </a>
      <button type="button" className={styles.link} onClick={exit}>
        Sair da prévia
      </button>
    </div>
  );
}
