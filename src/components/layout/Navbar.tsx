import { useEffect, useState } from 'react';
import { navModules } from '@/app/modules';
import { Link, useIsActive, useLocation } from '@/router/router';
import { asset } from '@/lib/asset';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { isMac, useSearch } from '@/components/search/SearchProvider';
import site from '@/content/site.json';
import styles from './Navbar.module.css';

function NavItem({ path, label }: { path: string; label: string }) {
  const active = useIsActive(path);
  return (
    <Link to={path} className={styles.link} aria-current={active ? 'page' : undefined}>
      {label}
    </Link>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const { open } = useSearch();
  const { pathname } = useLocation();

  useEffect(() => setShortcut(isMac() ? '⌘ K' : 'Ctrl K'), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fecha o menu ao trocar de página.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    root.dataset.scrollLock = '';
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      delete root.dataset.scrollLock;
      root.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header className={styles.bar} data-scrolled={scrolled || menuOpen || undefined}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand} aria-label="PYM, página inicial">
            <img src={asset('brand/pym-logo.png')} alt="" width={795} height={452} className={styles.logo} />
            <span className={styles.brandText}>{site.title}</span>
          </Link>

          <nav className={styles.nav} aria-label="Módulos do arquivo">
            {navModules.map((m) => (
              <NavItem key={m.id} path={m.path} label={m.label} />
            ))}
          </nav>

          <div className={styles.actions}>
            <button className={styles.search} onClick={open} aria-label="Buscar no arquivo" aria-keyshortcuts="Control+K Meta+K">
              <Icon name="search" size={17} />
              <span className={styles.searchLabel}>Buscar</span>
              <kbd className={styles.kbd}>{shortcut}</kbd>
            </button>
            <Button to={site.discordUrl} size="sm" icon={<Icon name="discord" size={16} />} className={styles.discord}>
              Discord
            </Button>
            <button
              className={styles.menuButton}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>
      </header>

      <div id="menu-mobile" className={styles.sheet} data-open={menuOpen || undefined} aria-hidden={!menuOpen}>
        <nav className={styles.sheetNav} aria-label="Módulos do arquivo">
          {navModules.map((m, i) => (
            <Link
              key={m.id}
              to={m.path}
              className={styles.sheetLink}
              style={{ transitionDelay: menuOpen ? `${60 + i * 40}ms` : '0ms' }}
              tabIndex={menuOpen ? 0 : -1}
            >
              <span className={`${styles.sheetCode} code`}>{m.code}</span>
              <span className={styles.sheetLabel}>{m.label}</span>
              <span className={styles.sheetDesc}>{m.description}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.sheetFooter}>
          <Button to={site.discordUrl} icon={<Icon name="discord" size={18} />}>
            Entrar no Discord
          </Button>
        </div>
      </div>
    </>
  );
}
