/**
 * Acesso ao painel por senha.
 *
 * O site é estático (GitHub Pages), então não existe servidor para guardar a senha.
 * O repositório guarda só um hash da senha (PBKDF2) e, depois que a publicação é
 * configurada, o token do GitHub criptografado com a própria senha (AES-GCM).
 * Quem não sabe a senha não entra no painel nem consegue publicar.
 *
 * Configuração em `src/content/painel.json`, gravada pelo próprio painel.
 */
import initial from '@/content/painel.json';

export interface EncryptedToken {
  salt: string;
  iv: string;
  data: string;
}

export interface PanelConfig {
  version: 1;
  iterations: number;
  salt: string;
  hash: string;
  repo: { owner: string; repo: string; branch: string };
  token: EncryptedToken | null;
}

export const CONFIG_PATH = 'src/content/painel.json';

let config = initial as unknown as PanelConfig;
export const getConfig = () => config;
export const setConfig = (c: PanelConfig) => (config = c);

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function baseKey(password: string) {
  return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
}

async function hashWith(password: string, salt: Uint8Array, iterations: number) {
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, await baseKey(password), 256);
  return b64(bits);
}

async function aesKey(password: string, salt: Uint8Array, iterations: number) {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    await baseKey(password),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Compara em tempo constante para não vazar quantos caracteres batem. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(password: string, c: PanelConfig = config): Promise<boolean> {
  return same(await hashWith(password, unb64(c.salt), c.iterations), c.hash);
}

export async function decryptToken(password: string, c: PanelConfig = config): Promise<string | null> {
  if (!c.token) return null;
  try {
    const key = await aesKey(password, unb64(c.token.salt), c.iterations);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(c.token.iv) }, key, unb64(c.token.data));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

async function encryptToken(token: string, password: string, iterations: number): Promise<EncryptedToken> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(password, salt, iterations);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(token));
  return { salt: b64(salt), iv: b64(iv), data: b64(data) };
}

/** Nova configuração com a senha (e o token, se houver) trocados. */
export async function buildConfig(password: string, repo: PanelConfig['repo'], token: string | null): Promise<PanelConfig> {
  const iterations = 250000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    version: 1,
    iterations,
    salt: b64(salt),
    hash: await hashWith(password, salt, iterations),
    repo,
    token: token ? await encryptToken(token, password, iterations) : null,
  };
}

/* ── Sessão ─────────────────────────────────────────────────── */

const SESSION_KEY = 'pym-admin:session';
const SESSION_HOURS = 12;

export function hasSession(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { until, hash } = JSON.parse(raw) as { until: number; hash: string };
    // A sessão cai se a senha for trocada (o hash muda) ou se passar da validade
    return Date.now() < until && hash === config.hash;
  } catch {
    return false;
  }
}

export function saveSession(keep: boolean) {
  const value = JSON.stringify({ until: Date.now() + (keep ? 24 * 30 : SESSION_HOURS) * 3600_000, hash: config.hash });
  try {
    (keep ? localStorage : sessionStorage).setItem(SESSION_KEY, value);
  } catch {
    /* sem armazenamento: a sessão dura até recarregar */
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nada */
  }
}
