import { characterTitle, type Character } from '@/data';

/** Ordem padrão do Database: pelo código do registro, depois pelo título. */
export function sortCharacters(list: Character[]): Character[] {
  return [...list].sort(
    (a, b) =>
      (a.code ?? '￿').localeCompare(b.code ?? '￿') ||
      characterTitle(a).localeCompare(characterTitle(b), 'pt-BR'),
  );
}
