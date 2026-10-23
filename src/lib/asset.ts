import { isPreview, readUploads } from '@/data/contentFiles';

/** Imagens enviadas no painel e ainda não publicadas (só na prévia). */
const staged: Record<string, string> = typeof window !== 'undefined' && isPreview() ? readUploads() : {};

/** Imagens enviadas nesta sessão do painel, para mostrar antes de publicar. */
export const sessionUploads: Record<string, string> = {};

/** Resolve um arquivo de /public respeitando a base do GitHub Pages. */
export function asset(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const local = sessionUploads[path] ?? staged[path];
  if (local) return local;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

/** Remove acentos e caixa para comparações e busca. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
