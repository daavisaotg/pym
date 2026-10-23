import type { Book, Grade } from '@/data/magic';

export const shelfOrder: Grade[] = ['aprendiz', 'adepto', 'mathet', 'grao-mestre'];

const labels: Record<Book['shelf'], string> = {
  aprendiz: 'Aprendiz',
  adepto: 'Adepto',
  mathet: 'Mathet',
  'grao-mestre': 'Grão-Mestre',
  universal: 'Universal',
};

export const shelfLabel = (s: Book['shelf']) => labels[s];

/** Livros com páginas recuperadas brilham e podem ser folheados. */
export const isRecovered = (b: Book) => Boolean(b.pages?.length);
