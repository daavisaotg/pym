import { navModules } from '@/app/modules';
import { Link } from '@/router/router';
import { asset } from '@/lib/asset';
import site from '@/content/site.json';
import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <img src={asset('brand/pym-logo.png')} alt="PYM" width={795} height={452} className={styles.logo} />
          <p className={styles.tagline}>
            {site.genre} no {site.platform}, desde {site.foundedYear}.
          </p>
        </div>

        <nav className={styles.col} aria-label="Módulos">
          <p className={styles.heading}>Arquivo</p>
          {navModules.map((m) => (
            <Link key={m.id} to={m.path} className={styles.link}>
              {m.label}
            </Link>
          ))}
        </nav>

        <nav className={styles.col} aria-label="Comunidade">
          <p className={styles.heading}>Comunidade</p>
          <Link to="/#sobre" className={styles.link}>
            O que é o PYM
          </Link>
          <Link to="/#diretrizes" className={styles.link}>
            Diretrizes
          </Link>
          <Link to="/#anthony" className={styles.link}>
            Anthony, The Ant
          </Link>
          <Link to={site.discordUrl} className={styles.link}>
            Discord
          </Link>
        </nav>

        <div className={styles.col}>
          <p className={styles.heading}>Selos</p>
          <img src={asset('brand/pym-comics.png')} alt="PYM Comics" width={1757} height={452} className={styles.seal} />
          <img src={asset('brand/pym-studios.png')} alt="PYM Studios" width={1757} height={452} className={styles.seal} />
        </div>
      </div>

      <div className={`container ${styles.legal}`}>
        <p>
          © {year} PYM. Projeto de fãs sem fins lucrativos. Personagens e marcas da Marvel e da DC Comics pertencem
          aos seus respectivos detentores.
        </p>
      </div>
    </footer>
  );
}
