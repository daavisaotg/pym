import { useMemo, useState } from 'react';
import { contentFiles, type ContentFileId } from '@/data/contentFiles';
import { asset } from '@/lib/asset';
import { Link } from '@/router/router';
import { labelOfFile, sections } from './schema';
import { getIn, sectionValue } from './path';
import { dirtyIds, discard, discardAll, exportZip, fileText, publish, removeUpload, useAdmin } from './store';
import { download } from './zip';
import styles from './Admin.module.css';

type Rec = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : '');

interface Change {
  section: string;
  added: string[];
  edited: string[];
  removed: string[];
  form: boolean;
}

/** O que mudou em cada seção de um arquivo, por registro. */
function describe(id: ContentFileId, base: unknown, draft: unknown): Change[] {
  const out: Change[] = [];
  for (const sec of sections.filter((x) => x.file === id)) {
    const b = sectionValue(base, sec);
    const d = sectionValue(draft, sec);
    if (JSON.stringify(b) === JSON.stringify(d)) continue;
    if (sec.type === 'object' || !Array.isArray(b) || !Array.isArray(d)) {
      out.push({ section: sec.label, added: [], edited: [], removed: [], form: true });
      continue;
    }
    const key = sec.idKey ?? 'id';
    const name = (r: Rec) => sec.titleOf?.(r) || s(r[sec.nameKey ?? 'name']) || s(r[key]);
    const bm = new Map((b as Rec[]).map((r) => [s(r[key]), r]));
    const dm = new Map((d as Rec[]).map((r) => [s(r[key]), r]));
    const c: Change = { section: sec.label, added: [], edited: [], removed: [], form: false };
    for (const [k, r] of dm) {
      if (!bm.has(k)) c.added.push(name(r));
      else if (JSON.stringify(bm.get(k)) !== JSON.stringify(r)) c.edited.push(name(r));
    }
    for (const [k, r] of bm) if (!dm.has(k)) c.removed.push(name(r));
    if (!c.added.length && !c.edited.length && !c.removed.length) c.form = true; // só a ordem mudou
    out.push(c);
  }
  // Mudanças fora das seções conhecidas
  if (!out.length) out.push({ section: 'Arquivo', added: [], edited: [], removed: [], form: true });
  return out;
}

export function PublishView() {
  const admin = useAdmin();
  const pending = dirtyIds(admin);
  const uploads = Object.entries(admin.uploads);
  const [message, setMessage] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const defaultMessage = useMemo(
    () => `Atualiza pelo painel: ${[...pending.map(labelOfFile), ...(uploads.length ? [`${uploads.length} imagem(ns)`] : [])].join(', ')}`,
    [pending, uploads.length],
  );

  const zip = () => {
    const blob = exportZip();
    if (blob) download(blob, `pym-conteudo-${new Date().toISOString().slice(0, 10)}.zip`);
  };

  if (!pending.length && !uploads.length) {
    return (
      <div className={styles.narrow}>
        <p className={`${styles.kicker} code`}>PUBLICAR</p>
        <h1 className={styles.h1}>Nada para publicar</h1>
        <p className={styles.muted}>O conteúdo do painel está igual ao publicado.</p>
        {admin.lastCommit && (
          <p className={styles.okBox}>
            Última publicação:{' '}
            <a href={admin.lastCommit.url} target="_blank" rel="noreferrer">
              commit {admin.lastCommit.sha.slice(0, 7)}
            </a>
            {admin.conn && (
              <>
                {' · '}
                <a href={`https://github.com/${admin.conn.owner}/${admin.conn.repo}/actions`} target="_blank" rel="noreferrer">
                  acompanhar a atualização do site
                </a>
              </>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.narrow}>
      <p className={`${styles.kicker} code`}>PUBLICAR</p>
      <h1 className={styles.h1}>Revisar alterações</h1>

      <ul className={styles.changes}>
        {pending.map((id) => {
          const f = admin.files[id]!;
          return (
            <li key={id} className={styles.changeFile}>
              <div className={styles.changeHead}>
                <strong>{labelOfFile(id)}</strong>
                <span className="code">{contentFiles[id].path}</span>
                {f.conflict && <span className={styles.tag}>mudou no GitHub desde o rascunho</span>}
                <span className={styles.changeTools}>
                  <button type="button" className={styles.small} onClick={() => download(new Blob([fileText(id)], { type: 'application/json' }), contentFiles[id].path.split('/').pop()!)}>
                    Baixar
                  </button>
                  <button type="button" className={styles.small} data-danger onClick={() => discard(id)}>
                    Descartar
                  </button>
                </span>
              </div>
              <ul className={styles.changeList}>
                {describe(id, f.base, f.draft).map((c) => (
                  <li key={c.section}>
                    <span className={styles.changeSection}>{c.section}</span>
                    {c.form && <span className={styles.state} data-state="editado">alterado</span>}
                    {c.added.map((n) => (
                      <span key={`a${n}`} className={styles.state} data-state="novo">
                        + {n}
                      </span>
                    ))}
                    {c.edited.map((n) => (
                      <span key={`e${n}`} className={styles.state} data-state="editado">
                        ~ {n}
                      </span>
                    ))}
                    {c.removed.map((n) => (
                      <span key={`r${n}`} className={styles.state} data-state="removido">
                        − {n}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
        {uploads.length > 0 && (
          <li className={styles.changeFile}>
            <div className={styles.changeHead}>
              <strong>Imagens novas</strong>
              <span className="code">public/uploads/</span>
            </div>
            <ul className={styles.uploadGrid}>
              {uploads.map(([path]) => (
                <li key={path}>
                  <img src={asset(path)} alt="" />
                  <span className="code">{path.replace('uploads/', '')}</span>
                  <button type="button" className={styles.small} data-danger onClick={() => removeUpload(path)}>
                    Remover
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.help}>Imagens que nenhum registro usa mais ficam de fora da publicação.</p>
          </li>
        )}
      </ul>

      <section className={styles.panelCard}>
        <h2 className={styles.cardTitle}>Publicar no site</h2>
        {admin.conn ? (
          <>
            <label className={styles.label} htmlFor="commit-msg">
              Descrição da alteração
            </label>
            <input id="commit-msg" className={styles.input} value={message} placeholder={defaultMessage} onChange={(e) => setMessage(e.target.value)} />
            <div className={styles.addRow}>
              <button type="button" className={styles.primary} disabled={Boolean(admin.busy)} onClick={() => publish(message.trim() || defaultMessage)}>
                {admin.busy ? 'Publicando…' : `Publicar em ${admin.conn.owner}/${admin.conn.repo}`}
              </button>
              <button type="button" className={styles.ghost} onClick={zip}>
                Baixar .zip
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              A publicação ainda não está ativa. <Link to="/admin/conectar">Configure a publicação</Link> uma vez para publicar direto, ou baixe o .zip e envie os
              arquivos pelo GitHub (eles já estão nas pastas certas: descompacte na raiz do projeto).
            </p>
            <button type="button" className={styles.primary} onClick={zip}>
              Baixar .zip
            </button>
          </>
        )}
      </section>

      <p className={styles.muted}>
        {confirmDiscard ? (
          <>
            Apagar todos os rascunhos e imagens novas?{' '}
            <button type="button" className={styles.danger} onClick={() => (discardAll(), setConfirmDiscard(false))}>
              Sim, descartar tudo
            </button>{' '}
            <button type="button" className={styles.inlineBtn} onClick={() => setConfirmDiscard(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" className={styles.inlineBtn} onClick={() => setConfirmDiscard(true)}>
            Descartar todas as alterações
          </button>
        )}
      </p>
    </div>
  );
}
