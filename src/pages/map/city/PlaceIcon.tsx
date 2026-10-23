import type { CityPlace } from '@/data/city';

type IconName = NonNullable<CityPlace['icon']>;

const glyphs: Record<IconName, string> = {
  ponto: 'M0 -3.2L3.2 0L0 3.2L-3.2 0Z',
  torre: 'M-2.5 5V-4.5H2.5V5M-4 5H4M-1 -2H1M-1 0.5H1',
  bar: 'M-4.5 -4.5H4.5L0 0.5ZM0 0.5V4.5M-2.8 4.5H2.8',
  portal: 'M-4.5 5V-0.5A4.5 4.5 0 0 1 4.5 -0.5V5M-1.8 5V1A1.8 1.8 0 0 1 1.8 1V5',
  acesso: 'M-4.5 0A4.5 4.5 0 1 0 4.5 0A4.5 4.5 0 1 0 -4.5 0M-3 -1.5H3M-3 1.5H3',
  escudo: 'M0 -5L4.2 -3.4V0.4C4.2 2.8 2.4 4.4 0 5.2C-2.4 4.4 -4.2 2.8 -4.2 0.4V-3.4Z',
  antena: 'M0 5V-1.5M-1.8 5H1.8M-3.6 -3.4A4.5 4.5 0 0 1 3.6 -3.4M-1.8 -1.6A2.2 2.2 0 0 1 1.8 -1.6',
  portao: 'M-5.5 -4H5.5M-4.5 -1.6H4.5M-3 -4V5M3 -4V5',
  cruz: 'M0 -5V5M-3.2 -1.8H3.2',
  onda: 'M-5 -1Q-2.5 -4 0 -1T5 -1M-5 2.6Q-2.5 -0.4 0 2.6T5 2.6',
};

/** Ícone desenhado dentro do marcador de um local. */
export function PlaceIcon({ name }: { name: IconName }) {
  return <path d={glyphs[name] ?? glyphs.ponto} className="place-icon" data-icon={name} />;
}
