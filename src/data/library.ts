import type { LibraryCategory } from './types';

export interface CategoryInfo {
  id: LibraryCategory;
  label: string;
  /** Uma frase sobre o que a categoria guarda */
  text: string;
}

/** Ordem das abas da Biblioteca. Categorias sem verbetes não aparecem. */
export const libraryCategories: CategoryInfo[] = [
  { id: 'artefatos', label: 'Artefatos', text: 'Relíquias, armas e objetos de poder.' },
  { id: 'raças', label: 'Raças', text: 'Povos e espécies que habitam o universo.' },
  { id: 'pactos', label: 'Forças, pactos e maldições', text: 'Entidades e energias que se ligam a um hospedeiro.' },
  { id: 'tropas', label: 'Tropas galácticas', text: 'Ordens e corporações que guardam ou disputam as estrelas.' },
  { id: 'simbiontes', label: 'Simbiontes', text: 'Os Klyntar e suas crias.' },
  { id: 'magias', label: 'Magias', text: 'Feitiços e tradições místicas.' },
  { id: 'tecnologias', label: 'Tecnologias', text: 'Inventos e ciência do universo.' },
  { id: 'dimensões', label: 'Dimensões', text: 'Planos e realidades além da nossa.' },
];

export const categoryInfo = (id: LibraryCategory) => libraryCategories.find((c) => c.id === id)!;
