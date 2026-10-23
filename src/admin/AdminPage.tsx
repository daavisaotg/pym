import { useEffect, useState } from 'react';
import { contentFiles, isPreview, setPreview, type ContentFileId } from '@/data/contentFiles';
import { Link, toHref, useLocation, useParams } from '@/router/router';
import { getIn, sectionValue } from './path';
import { groupsInOrder, labelOfFile, sectionById, sections, type Section } from './schema';
import { asset } from '@/lib/asset';
import { SectionView } from './SectionView';
import { ConnectView } from './ConnectView';
import { PublishView } from './PublishView';
import { clearMessages, dirtyIds, init, isDirty, logout, useAdmin } from './store';
import { LoginView } from './LoginView';
import styles from './Admin.module.css';


function sectionDirty(s: Section, files: ReturnType<typeof useAdmin>['files']) {
  const f = files[s.file];
  if (!f || !isDirty(f)) return false;
  return JSON.stringify(sectionValue(f.base, s)) !== JSON.stringify(sectionValue(f.draft, s));
}

export default function AdminPage() {
  const admin = useAdmin();
  const params = useParams<{ '*': string }>();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const route = (params['*'] ?? '').split('/')[0];
  const section = sectionById(route);
  const pending = dirtyIds(admin);
  const uploads = Object.keys(admin.uploads).length;

  useEffect(() => {
    init();
  }, []);

  useEffect(() => setMenu(false), [pathname]);

  // Avisa antes de fechar a aba com alterações ainda não publicadas (elas ficam salvas, mas é bom lembrar)
  useEffect(() => {
    if (!pending.length) return;
    const on = (e: BeforeUnloadEvent) => {
      if (!admin.conn) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [pending.length, admin.conn]);

  const openPreview = () => {
    setPreview(true);
    window.open(toHref('/'), '_blank');
  };

  if (!admin.authed) return <LoginView />;

  return (
    <div className={styles.shell} data-menu={menu || undefined}>
      <title>Painel | PYM</title>
      <meta name="robots" content="noindex, nofollow" />

      <aside className={styles.side} aria-label="Seções do painel">
        <Link to="/admin" className={styles.brand}>
          <img src={asset('brand/pym-logo.png')} alt="" />
          <span>
            <strong>Painel</strong>
            <small className="code">ARQUIVO DO MULTIVERSO</small>
          </span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/admin" className={styles.navItem} aria-current={!route ? 'page' : undefined}>
            Início
          </Link>
          {groupsInOrder.map((g) => (
            <div key={g} className={styles.navGroup}>
              <p className={`${styles.navTitle} code`}>{g.toUpperCase()}</p>
              {sections
                .filter((s) => s.group === g)
                .map((s) => (
                  <Link key={s.id} to={`/admin/${s.id}`} className={styles.navItem} aria-current={route === s.id ? 'page' : undefined}>
                    {s.label}
                    {sectionDirty(s, admin.files) && <span className={styles.dot} aria-label="com alterações" />}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className={styles.sideFoot}>
          <p className={styles.connLine} data-on={admin.conn ? '' : undefined}>
            <span className={styles.connDot} />
            <Link to="/admin/conectar">{admin.conn ? 'Publicação ativa' : 'Publicação não configurada'}</Link>
          </p>
          <button type="button" className={styles.sideLink} onClick={logout}>
            Sair do painel
          </button>
          <a href={toHref('/')} className={styles.sideLink}>
            ← Voltar ao site
          </a>
        </div>
      </aside>

      <div className={styles.mainCol}>
        <header className={styles.top}>
          <button type="button" className={styles.menuBtn} onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Abrir seções">
            ☰
          </button>
          <p className={`${styles.crumb} code`}>
            PAINEL{section ? ` / ${section.group.toUpperCase()} / ${section.label.toUpperCase()}` : route ? ` / ${route.toUpperCase()}` : ''}
          </p>
          <div className={styles.topActions}>
            <button type="button" className={styles.ghost} onClick={openPreview} title="Abre o site com os rascunhos deste navegador">
              Prévia do site ↗
            </button>
            <Link to="/admin/publicar" className={styles.primary} data-count={pending.length + uploads || undefined}>
              {pending.length || uploads ? `Publicar (${pending.length + uploads})` : 'Publicar'}
            </Link>
          </div>
        </header>

        {(admin.error || admin.notice || admin.busy) && (
          <div className={styles.toast} data-kind={admin.error ? 'error' : admin.busy ? 'busy' : 'ok'} role="status">
            <span>{admin.error ?? admin.busy ?? admin.notice}</span>
            {!admin.busy && (
              <button type="button" onClick={clearMessages} aria-label="Fechar aviso">
                ×
              </button>
            )}
          </div>
        )}

        <div className={styles.content}>
          {!admin.ready ? (
            <p className={styles.empty}>Abrindo o arquivo…</p>
          ) : section ? (
            <SectionView key={section.id} section={section} />
          ) : route === 'conectar' || route === 'configuracoes' ? (
            <ConnectView />
          ) : route === 'publicar' ? (
            <PublishView />
          ) : (
            <Dashboard pending={pending} onPreview={openPreview} />
          )}
        </div>
      </div>
      <button type="button" className={styles.scrim} onClick={() => setMenu(false)} aria-label="Fechar menu" tabIndex={-1} />
    </div>
  );
}

function Dashboard({ pending, onPreview }: { pending: ContentFileId[]; onPreview: () => void }) {
  const admin = useAdmin();
  const count = (s: Section) => {
    const v = getIn(admin.files[s.file]?.draft, s.path);
    return Array.isArray(v) ? v.length : null;
  };
  return (
    <div className={styles.dash}>
      <header>
        <p className={`${styles.kicker} code`}>PAINEL ADMINISTRATIVO</p>
        <h1 className={styles.h1}>Arquivo do Multiverso</h1>
        <p className={styles.muted}>
          Edite personagens, lore, mapa, Kamar-Taj e os textos do site. As alterações ficam salvas como rascunho neste navegador até você
          publicar.
        </p>
      </header>

      <div className={styles.dashCards}>
        <section className={styles.panelCard}>
          <h2 className={styles.cardTitle}>Publicação</h2>
          {admin.conn ? (
            <p>
              Publicação ativa em <strong>{admin.conn.owner}/{admin.conn.repo}</strong>. O botão Publicar envia as alterações e o site se atualiza
              sozinho em 1 ou 2 minutos.
            </p>
          ) : (
            <p>
              A publicação ainda não está ativa. Você pode editar e baixar os arquivos num .zip, ou{' '}
              <Link to="/admin/conectar">configurar a publicação</Link> uma vez para a staff publicar só com a senha.
            </p>
          )}
          <p className={styles.muted}>
            Prévia do site: {isPreview() ? 'ligada neste navegador' : 'desligada'}.{' '}
            <button type="button" className={styles.inlineBtn} onClick={onPreview}>
              Abrir prévia
            </button>
            {isPreview() && (
              <>
                {' · '}
                <button type="button" className={styles.inlineBtn} onClick={() => (setPreview(false), window.location.reload())}>
                  Desligar
                </button>
              </>
            )}
          </p>
        </section>
        <section className={styles.panelCard}>
          <h2 className={styles.cardTitle}>Alterações pendentes</h2>
          {pending.length || Object.keys(admin.uploads).length ? (
            <>
              <ul className={styles.pendingList}>
                {pending.map((id) => (
                  <li key={id}>
                    {labelOfFile(id)} <span className="code">{contentFiles[id].path}</span>
                    {admin.files[id]?.conflict && <span className={styles.tag}>mudou no GitHub</span>}
                  </li>
                ))}
                {Object.keys(admin.uploads).length > 0 && <li>{Object.keys(admin.uploads).length} imagem(ns) nova(s)</li>}
              </ul>
              <Link to="/admin/publicar" className={styles.primary}>
                Revisar e publicar
              </Link>
            </>
          ) : (
            <p className={styles.muted}>Nenhuma. Tudo igual ao que está publicado.</p>
          )}
        </section>
      </div>

      {groupsInOrder.map((g) => (
        <section key={g} className={styles.dashGroup}>
          <h2 className={`${styles.navTitle} code`}>{g.toUpperCase()}</h2>
          <ul className={styles.tiles}>
            {sections
              .filter((s) => s.group === g)
              .map((s) => {
                const n = count(s);
                return (
                  <li key={s.id}>
                    <Link to={`/admin/${s.id}`} className={styles.tile} data-dirty={sectionDirty(s, admin.files) || undefined}>
                      <span className={styles.tileLabel}>{s.label}</span>
                      <span className={styles.tileMeta}>{n !== null ? `${n} ${n === 1 ? 'registro' : 'registros'}` : 'Formulário'}</span>
                      {s.hint && <span className={styles.tileHint}>{s.hint}</span>}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
