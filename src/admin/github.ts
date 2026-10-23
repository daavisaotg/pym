/**
 * Publicação direta no repositório do site pela API do GitHub.
 * Cada publicação vira um único commit; o GitHub Actions do projeto reconstrói o site.
 */

export interface Connection {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  /** Login de quem conectou */
  user?: string;
}

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(c: Connection, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${c.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new GitHubError('Sem conexão com o GitHub. Verifique a internet.', 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const msg =
      res.status === 401
        ? 'Token inválido ou expirado.'
        : res.status === 403
          ? 'O token não tem permissão para isso (precisa de "Contents: Read and write").'
          : res.status === 404
            ? 'Repositório, branch ou arquivo não encontrado (ou o token não tem acesso a ele).'
            : res.status === 409 || res.status === 422
              ? `O GitHub recusou a alteração: ${body.message ?? 'conflito'}.`
              : (body.message ?? `Erro ${res.status} no GitHub.`);
    throw new GitHubError(msg, res.status);
  }
  return (await res.json()) as T;
}

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/** Confere token e permissão de escrita. Devolve o login do usuário. */
export async function verify(c: Connection): Promise<string> {
  const repo = await call<{ permissions?: { push?: boolean }; default_branch: string }>(c, `/repos/${c.owner}/${c.repo}`);
  if (!repo.permissions?.push) throw new GitHubError('Este token só lê o repositório. Ele precisa de permissão de escrita.', 403);
  await call(c, `/repos/${c.owner}/${c.repo}/branches/${encodeURIComponent(c.branch)}`);
  const user = await call<{ login: string }>(c, '/user').catch(() => ({ login: c.owner }));
  return user.login;
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Lê um arquivo de texto do repositório. */
export async function readFile(c: Connection, path: string): Promise<{ text: string; sha: string }> {
  const f = await call<{ content?: string; sha: string; encoding?: string; download_url?: string }>(
    c,
    `/repos/${c.owner}/${c.repo}/contents/${enc(path)}?ref=${encodeURIComponent(c.branch)}`,
  );
  if (f.content && f.encoding === 'base64') return { text: fromBase64(f.content), sha: f.sha };
  // Arquivos acima de 1 MB vêm sem conteúdo: busca pelo blob
  const blob = await call<{ content: string }>(c, `/repos/${c.owner}/${c.repo}/git/blobs/${f.sha}`);
  return { text: fromBase64(blob.content), sha: f.sha };
}

export async function fileSha(c: Connection, path: string): Promise<string | null> {
  try {
    const f = await call<{ sha: string }>(c, `/repos/${c.owner}/${c.repo}/contents/${enc(path)}?ref=${encodeURIComponent(c.branch)}`);
    return f.sha;
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return null;
    throw e;
  }
}

export interface CommitFile {
  path: string;
  /** Texto (JSON) ou base64 (imagens) */
  content: string;
  encoding: 'utf-8' | 'base64';
}

/** Cria um commit com vários arquivos de uma vez. */
export async function commit(c: Connection, files: CommitFile[], message: string): Promise<{ sha: string; url: string }> {
  const base = `/repos/${c.owner}/${c.repo}`;
  const ref = await call<{ object: { sha: string } }>(c, `${base}/git/ref/heads/${encodeURIComponent(c.branch)}`);
  const parent = await call<{ tree: { sha: string } }>(c, `${base}/git/commits/${ref.object.sha}`);
  const tree = [];
  for (const f of files) {
    const blob = await call<{ sha: string }>(c, `${base}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: f.content, encoding: f.encoding }),
    });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await call<{ sha: string }>(c, `${base}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
  });
  const created = await call<{ sha: string; html_url: string }>(c, `${base}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }),
  });
  await call(c, `${base}/git/refs/heads/${encodeURIComponent(c.branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: created.sha }),
  });
  return { sha: created.sha, url: created.html_url };
}

/** Palpite de dono e repositório quando o site roda em usuario.github.io/repo. */
export function guessRepo(): { owner: string; repo: string } {
  const host = window.location.hostname;
  if (!host.endsWith('.github.io')) return { owner: '', repo: '' };
  const owner = host.replace('.github.io', '');
  const first = (import.meta.env.BASE_URL || '/').split('/').filter(Boolean)[0];
  return { owner, repo: first ?? `${owner}.github.io` };
}
