import { useState, type FormEvent } from 'react';
import { getConfig } from './auth';
import { changePassword, knowsPassword, publishingReady, setupPublishing, useAdmin } from './store';
import styles from './Admin.module.css';

/** Configurações do painel: publicação no GitHub (uma vez só) e troca de senha. */
export function ConnectView() {
  const admin = useAdmin();
  const cfg = getConfig();
  const ready = publishingReady();

  return (
    <div className={styles.narrow}>
      <p className={`${styles.kicker} code`}>CONFIGURAÇÕES</p>
      <h1 className={styles.h1}>Acesso e publicação</h1>

      <section className={styles.panelCard}>
        <h2 className={styles.cardTitle}>Publicação</h2>
        {ready && admin.conn ? (
          <p className={styles.okBox}>
            Ativa em {admin.conn.owner}/{admin.conn.repo} ({admin.conn.branch}). Quem entra com a senha publica direto pelo botão Publicar.
          </p>
        ) : ready ? (
          <p className={styles.warnBox}>
            A publicação está configurada, mas não abriu nesta sessão. Saia e entre de novo com a senha; se continuar, o token pode ter vencido e precisa ser trocado abaixo.
          </p>
        ) : (
          <p className={styles.warnBox}>
            Ainda não configurada. Faça isso uma vez só: depois, a staff publica apenas com a senha, sem precisar de conta no GitHub.
          </p>
        )}
        <SetupForm repo={cfg.repo} replacing={ready} />
      </section>

      <section className={styles.panelCard}>
        <h2 className={styles.cardTitle}>Trocar a senha</h2>
        <PasswordForm disabled={!ready || !admin.conn} />
      </section>

      <section className={styles.howto}>
        <h2 className={styles.cardTitle}>Como funciona a segurança</h2>
        <ul>
          <li>O site é estático, sem servidor. O repositório guarda só um código embaralhado da senha (hash), nunca a senha em si.</li>
          <li>O token do GitHub fica guardado criptografado com a senha. Sem a senha, ninguém consegue usá-lo para publicar.</li>
          <li>Use uma senha longa e não a compartilhe fora da staff. Se alguém sair da equipe, troque a senha aqui.</li>
        </ul>
      </section>
    </div>
  );
}

function SetupForm({ repo, replacing }: { repo: { owner: string; repo: string; branch: string }; replacing: boolean }) {
  const admin = useAdmin();
  const [owner, setOwner] = useState(repo.owner);
  const [name, setName] = useState(repo.repo);
  const [branch, setBranch] = useState(repo.branch);
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [open, setOpen] = useState(!replacing);
  const needPw = !knowsPassword();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await setupPublishing(token.trim(), { owner: owner.trim(), repo: name.trim(), branch: branch.trim() || 'main' }, pw || '');
    if (ok) {
      setToken('');
      setPw('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className={styles.ghost} onClick={() => setOpen(true)}>
        Trocar o token do GitHub
      </button>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <ol className={styles.steps}>
        <li>
          No GitHub, abra <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</strong>.
        </li>
        <li>
          Em <strong>Repository access</strong>, escolha <strong>Only select repositories</strong> e marque só <strong>{owner}/{name}</strong>.
        </li>
        <li>
          Em <strong>Repository permissions</strong>, deixe <strong>Contents</strong> como <strong>Read and write</strong>. Escolha a validade
          mais longa que quiser.
        </li>
        <li>Gere o token e cole abaixo.</li>
      </ol>
      <div className={styles.fields}>
        <div className={styles.field} data-half>
          <label className={styles.label} htmlFor="cfg-owner">
            Dono
          </label>
          <input id="cfg-owner" className={styles.input} value={owner} onChange={(e) => setOwner(e.target.value)} required />
        </div>
        <div className={styles.field} data-half>
          <label className={styles.label} htmlFor="cfg-repo">
            Repositório
          </label>
          <input id="cfg-repo" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className={styles.field} data-half>
          <label className={styles.label} htmlFor="cfg-branch">
            Branch
          </label>
          <input id="cfg-branch" className={styles.input} value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="cfg-token">
            Token do GitHub
          </label>
          <input id="cfg-token" className={styles.input} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" required />
        </div>
        {needPw && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cfg-pw">
              Senha do painel (para criptografar o token)
            </label>
            <input id="cfg-pw" className={styles.input} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
        )}
      </div>
      <button type="submit" className={styles.primary} disabled={Boolean(admin.busy)}>
        {admin.busy ? 'Configurando…' : 'Salvar e ativar a publicação'}
      </button>
    </form>
  );
}

function PasswordForm({ disabled }: { disabled: boolean }) {
  const admin = useAdmin();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (next.length < 10) return setMsg('Use pelo menos 10 caracteres.');
    if (next !== again) return setMsg('As duas senhas novas não são iguais.');
    if (await changePassword(current, next)) {
      setCurrent('');
      setNext('');
      setAgain('');
    }
  };

  if (disabled) return <p className={styles.muted}>Disponível depois que a publicação estiver ativa, porque a senha nova é gravada no repositório.</p>;

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pw-now">
            Senha atual
          </label>
          <input id="pw-now" className={styles.input} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className={styles.field} data-half>
          <label className={styles.label} htmlFor="pw-new">
            Senha nova
          </label>
          <input id="pw-new" className={styles.input} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div className={styles.field} data-half>
          <label className={styles.label} htmlFor="pw-again">
            Repita a senha nova
          </label>
          <input id="pw-again" className={styles.input} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
        </div>
      </div>
      {msg && <p className={styles.warn}>{msg}</p>}
      <button type="submit" className={styles.primary} disabled={Boolean(admin.busy)}>
        Trocar senha
      </button>
    </form>
  );
}
