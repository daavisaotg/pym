import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import site from '@/content/site.json';
import styles from './Sections.module.css';

export function JoinSection() {
  return (
    <section className={`container ${styles.section}`} aria-labelledby="entrar-titulo">
      <div className={styles.join}>
        <h2 id="entrar-titulo" className={styles.joinTitle}>
          Sua história começa no Discord
        </h2>
        <p className={styles.joinText}>
          Entre no servidor para conhecer a comunidade, criar seu personagem e começar a escrever seu arco.
        </p>
        <Button to={site.discordUrl} icon={<Icon name="discord" size={18} />}>
          Entrar no Discord
        </Button>
      </div>
    </section>
  );
}
