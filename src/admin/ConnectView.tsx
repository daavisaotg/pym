import { useState, type FormEvent } from 'react';
import { useNavigate } from '@/router/router';
import { guessRepo } from './github';
import { connect, savedRepo, useAdmin } from './store';
import styles from './Admin.module.css';

/** Formulário de conexão com o repositório do site no GitHub. */
export function ConnectView() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const saved = savedRepo();
  const guess = guessRepo();
  const [owner, setOwner] = useState(saved.owner ?? guess.owner);
  const [repo, setRepo] = useState(saved.repo ?? guess.repo);
  const [branch, setBranch] = useState(saved.branch ?? 'main');
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await connect({ owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main', token: token.trim() }, remember);
    if (ok) navigate('/admin');
  };

  return (
    <div className={styles.narrow}>
      <p className={`${styles.kicker} code`}>CONEXÃO</p>
      <h1 className={styles.h1}>Conectar ao GitHub</h1>
      <p className={styles.muted}>
        O site mora no GitHub Pages, sem servidor. Para publicar daqui, o painel usa um token seu com permissão de escrita só no repositório do
        site. Cada publicação vira um commit, e o GitHub Actions reconstrói o site.
      </p>

      {admin.conn && (
        <p className={styles.okBox}>
          Já conectado a {admin.conn.owner}/{admin.conn.repo} como {admin.conn.user}. Conectar de novo troca o token.
        </p>
      )}

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.fields}>
          <div className={styles.field} data-half>
            <label className={styles.label} htmlFor="gh-owner">
              Dono do repositório
            </label>
            <input id="gh-owner" className={styles.input} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="usuario-ou-organizacao" required />
          </div>
          <div className={styles.field} data-half>
            <label className={styles.label} htmlFor="gh-repo">
              Repositório
            </label>
            <input id="gh-repo" className={styles.input} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="pym-site" required />
          </div>
          <div className={styles.field} data-half>
            <label className={styles.label} htmlFor="gh-branch">
              Branch
            </label>
            <input id="gh-branch" className={styles.input} value={branch} onChange={(e) => setBranch(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="gh-token">
              Token de acesso
            </label>
            <input
              id="gh-token"
              className={styles.input}
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_…"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.check}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Lembrar neste navegador (sem marcar, o token some ao fechar a aba)</span>
            </label>
          </div>
        </div>
        <button type="submit" className={styles.primary} disabled={Boolean(admin.busy)}>
          {admin.busy ? 'Conferindo…' : 'Conectar'}
        </button>
      </form>

      <section className={styles.howto}>
        <h2 className={styles.cardTitle}>Como criar o token</h2>
        <ol>
          <li>
            No GitHub, abra <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong> e clique em{' '}
            <strong>Generate new token</strong>.
          </li>
          <li>
            Em <strong>Repository access</strong>, escolha <strong>Only select repositories</strong> e marque só o repositório do site.
          </li>
          <li>
            Em <strong>Permissions → Repository permissions</strong>, deixe <strong>Contents</strong> como <strong>Read and write</strong>. Nada
            mais é necessário.
          </li>
          <li>Defina uma validade (90 dias, por exemplo), gere o token e cole aqui.</li>
        </ol>
        <p className={styles.muted}>
          Cada membro da staff pode ter o próprio token. Quem não tem token consegue abrir o painel, mas não publica nada. Use só em
          computadores de confiança e revogue o token no GitHub se ele vazar.
        </p>
      </section>
    </div>
  );
}
