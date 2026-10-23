import scale from '@/content/status.json';
import type { StatusTier } from './types';

export type TierGroup = 'humano' | 'super' | 'mega';

export interface TierInfo {
  id: StatusTier;
  label: string;
  group: TierGroup;
  general: string;
  restricted?: string;
  /** Posição na escala: 1 (Humano) a 9 (Mega +) */
  level: number;
}

export const tiers: TierInfo[] = scale.tiers.map((t, i) => ({
  ...(t as Omit<TierInfo, 'level'>),
  level: i + 1,
}));

export const maxLevel = tiers.length;

const byId = new Map(tiers.map((t) => [t.id, t]));
export const tierInfo = (id: StatusTier): TierInfo | undefined => byId.get(id);

export interface AttributeInfo {
  id: string;
  label: string;
  descriptions?: Partial<Record<StatusTier, string>>;
}

export const attributes: AttributeInfo[] = scale.attributes as AttributeInfo[];

const attrById = new Map(attributes.map((a) => [a.id, a]));

/** Nome de exibição do atributo; ids desconhecidos viram o próprio texto. */
export const attributeLabel = (id: string) =>
  attrById.get(id)?.label ?? id.charAt(0).toUpperCase() + id.slice(1);

/** Texto do nível para aquele atributo, ou o texto geral da escala. */
export function describeTier(attribute: string, tier: StatusTier): string {
  return attrById.get(attribute)?.descriptions?.[tier] ?? byId.get(tier)?.general ?? '';
}

/** Ordem fixa de exibição dos atributos conhecidos. */
export const attributeOrder = (id: string) => {
  const i = attributes.findIndex((a) => a.id === id);
  return i === -1 ? 99 : i;
};

export const scaleIntro = scale.intro;
export const scaleWarning = scale.warning;
