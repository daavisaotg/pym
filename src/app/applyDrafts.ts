/**
 * Modo prévia do painel: antes de o site renderizar, troca o conteúdo dos JSON
 * pelos rascunhos guardados neste navegador. Sem a prévia ligada, não faz nada
 * (e nenhum JSON extra é baixado).
 *
 * Funciona porque cada JSON é um único módulo: alterar o objeto aqui altera o
 * que todas as páginas importam.
 */
import { contentFiles, isPreview, pristine, readDrafts, type ContentFileId } from '@/data/contentFiles';

function replaceInPlace(target: unknown, next: unknown) {
  if (Array.isArray(target) && Array.isArray(next)) {
    target.splice(0, target.length, ...next);
    return;
  }
  if (target && typeof target === 'object' && next && typeof next === 'object') {
    const t = target as Record<string, unknown>;
    for (const k of Object.keys(t)) delete t[k];
    Object.assign(t, next);
  }
}

if (isPreview()) {
  const drafts = readDrafts();
  const ids = Object.keys(drafts) as ContentFileId[];
  await Promise.all(
    ids.map(async (id) => {
      const file = contentFiles[id];
      if (!file) return;
      const mod = (await file.load()) as { default: unknown };
      pristine[id] = structuredClone(mod.default);
      replaceInPlace(mod.default, drafts[id]!.data);
    }),
  );
}

export {};
