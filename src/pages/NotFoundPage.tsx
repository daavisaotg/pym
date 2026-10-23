import { useLocation } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useSearch } from '@/components/search/SearchProvider';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const { open } = useSearch();

  return (
    <section className={styles.wrap}>
      <Seo title="Registro não encontrado" />
      <p className={`${styles.code} code`}>ERRO 404</p>
      <h1 className={styles.title}>Registro não encontrado</h1>
      <p className={styles.text}>
        O endereço <span className="code">{pathname}</span> não existe no arquivo. Ele pode ter sido movido ou
        nunca ter sido catalogado.
      </p>
      <div className={styles.actions}>
        <Button to="/">Voltar ao início</Button>
        <button className={styles.search} onClick={open}>
          <Icon name="search" size={17} />
          Buscar no arquivo
        </button>
      </div>
    </section>
  );
}
