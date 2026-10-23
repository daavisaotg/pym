import type { Alignment, Character, RecordStatus } from './types';

export const alignmentLabel: Record<Alignment, string> = {
  herói: 'Herói',
  vilão: 'Vilão',
  'anti-herói': 'Anti-herói',
  neutro: 'Neutro',
};

export const statusLabel: Record<RecordStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  desaparecido: 'Desaparecido',
  falecido: 'Falecido',
  desconhecido: 'Desconhecido',
  classificado: 'Classificado',
};

/** Título da ficha: o codinome quando existe, senão o nome. */
export const characterTitle = (c: Pick<Character, 'codename' | 'name'>) => c.codename || c.name;

/** Organizações ligadas a um personagem (facções do arquivo + relações do tipo organização). */
export function characterOrganizations(c: Character, factionNames: Map<string, string>): string[] {
  const fromFactions = (c.factions ?? []).map((id) => factionNames.get(id) ?? id);
  const fromRelations = (c.relations ?? []).filter((r) => r.kind === 'organização').map((r) => r.name);
  return [...new Set([...fromFactions, ...fromRelations])];
}
