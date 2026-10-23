import { useRef, useState, type FormEvent } from 'react';
import { asset } from '@/lib/asset';
import { toHref } from '@/router/router';
import { login } from './store';
import styles from './Login.module.css';

/** Porta do painel: só entra quem sabe a senha. */
export function LoginView() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fails = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setError('');
    const ok = await login(pw, keep);
    if (!ok) {
      fails.current += 1;
      // Cada erro seguido demora um pouco mais
      await new Promise((r) => setTimeout(r, Math.min(4000, 600 * fails.current)));
      setError('Senha incorreta.');
      setPw('');
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={styles.gate}>
      <title>Acesso restrito | PYM</title>
      <meta name="robots" content="noindex, nofollow" />
      <form className={styles.card} onSubmit={submit} data-error={error ? '' : undefined}>
        <img src={asset('brand/anthony.png')} alt="" className={styles.mark} />
        <p className={`${styles.kicker} code`}>ARQUIVO DO MULTIVERSO · NÍVEL DE ACESSO: STAFF</p>
        <h1 className={styles.h1}>Acesso restrito</h1>
        <p className={styles.text}>Digite a senha do painel administrativo.</p>

        <label className={styles.label} htmlFor="painel-senha">
          Senha
        </label>
        <span className={styles.row}>
          <input
            ref={inputRef}
            id="painel-senha"
            className={styles.input}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'painel-erro' : undefined}
          />
          <button type="button" className={styles.eye} onClick={() => setShow(!show)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </span>
        {error && (
          <p id="painel-erro" className={styles.error} role="alert">
            {error}
          </p>
        )}

        <label className={styles.check}>
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          <span>Manter conectado neste navegador por 30 dias</span>
        </label>

        <button type="submit" className={styles.submit} disabled={busy || !pw}>
          {busy ? 'Conferindo…' : 'Entrar'}
        </button>

        <a href={toHref('/')} className={styles.back}>
          ← Voltar ao site
        </a>
      </form>
    </div>
  );
}
