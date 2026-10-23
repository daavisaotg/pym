import { Button } from './Button';
import { Icon } from './Icon';
import site from '@/content/site.json';
import styles from './InDevelopment.module.css';

interface Props {
  code: string;
  title: string;
  description: string;
  /** Registro específico pedido na URL (ex.: "terra-ultimate"). */
  requested?: string;
  note?: string;
}

/**
 * "IN DEVELOPMENT": usada pelos módulos ainda não entregues e,
 * mais adiante, pelos mapas de outras Terras.
 */
export function InDevelopment({ code, title, description, requested, note }: Props) {
  return (
    <section className={styles.wrap} aria-labelledby="dev-title">
      <div className={styles.frame}>
        <div className={styles.head}>
          <span className="code">MÓDULO {code}</span>
          <span className={styles.lock}>Acesso restrito</span>
        </div>

        <h1 id="dev-title" className={styles.title}>
          {title}
        </h1>

        <p className={styles.stamp} aria-label="Em desenvolvimento">
          IN DEVELOPMENT
        </p>

        <p className={styles.desc}>{description}</p>

        {requested && (
          <p className={styles.requested}>
            Registro solicitado: <span className="code">{requested}</span>
          </p>
        )}

        <div className={styles.redacted} aria-hidden="true">
          <span style={{ width: '82%' }} />
          <span style={{ width: '64%' }} />
          <span style={{ width: '74%' }} />
        </div>

        {note && <p className={styles.note}>{note}</p>}

        <div className={styles.actions}>
          <Button to="/" variant="ghost">
            Voltar ao início
          </Button>
          <Button to={site.discordUrl} icon={<Icon name="discord" size={18} />}>
            Acompanhar no Discord
          </Button>
        </div>
      </div>
    </section>
  );
}
