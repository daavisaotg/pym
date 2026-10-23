/**
 * Módulos do arquivo. A navbar, o menu mobile, o rodapé, a busca e as rotas
 * leem desta lista. Para ativar um módulo novo, troque `ready` para true e
 * aponte a rota para a página real em `src/router/routes.tsx`.
 */
export interface ArchiveModule {
  id: string;
  path: string;
  label: string;
  /** Código do módulo no sistema. */
  code: string;
  description: string;
  ready: boolean;
  /** Fase do roteiro em que o módulo entra. */
  phase: number;
  /** Aparece na navbar? (Notícias existe para a busca e o painel, sem item no menu.) */
  inNav: boolean;
  keywords?: string[];
}

export const modules: ArchiveModule[] = [
  {
    id: 'multiverso',
    path: '/multiverso',
    label: 'Multiverso',
    code: 'MV',
    description: 'Mapa galáctico das Terras, conexões e linha do tempo dos grandes eventos.',
    ready: true,
    phase: 3,
    inNav: true,
    keywords: ['terras', 'timeline', 'linha do tempo', 'eventos', 'temporadas', 'arcos', 'guerras'],
  },
  {
    id: 'database',
    path: '/database',
    label: 'Database',
    code: 'DB',
    description: 'Fichas de todos os personagens registrados, com filtros por Terra, alinhamento e status.',
    ready: true,
    phase: 2,
    inNav: true,
    keywords: ['personagens', 'fichas', 'heróis', 'vilões', 'anti-heróis'],
  },
  {
    id: 'faccoes',
    path: '/faccoes',
    label: 'Facções',
    code: 'FC',
    description: 'Organizações do universo: membros, bases, objetivos e relações.',
    ready: true,
    phase: 4,
    inNav: true,
    keywords: ['organizações', 'shield', 'hydra', 'aim', 'liga dos assassinos', 'agência'],
  },
  {
    id: 'biblioteca',
    path: '/biblioteca',
    label: 'Biblioteca',
    code: 'BL',
    description: 'Wiki oficial: artefatos, raças, pactos, tropas galácticas, simbiontes e a ala mística de Kamar-Taj.',
    ready: true,
    phase: 4,
    inNav: true,
    keywords: ['wiki', 'raças', 'artefatos', 'pactos', 'maldições', 'tropas', 'simbiontes', 'magia', 'kamar-taj', 'mana'],
  },
  {
    id: 'mapa',
    path: '/mapa',
    label: 'Mapa',
    code: 'MP',
    description: 'PYM-City em quatro camadas (Superior, Cidade, Inferioridade e Campos) e o modo Explorar com países e reinos.',
    ready: true,
    phase: 5,
    inNav: true,
    keywords: ['pym-city', 'cidade', 'ruas', 'bairros', 'chinatown', 'inferioridade', 'campos', 'cidade superior', 'explorar', 'wakanda', 'latveria', 'themyscira', 'atlantida', 'genosha'],
  },
  {
    id: 'fama',
    path: '/fama',
    label: 'Fama',
    code: 'HF',
    description: 'Hall da Fama: as maiores figuras da história do RP numa constelação dourada.',
    ready: true,
    phase: 4,
    inNav: true,
    keywords: ['hall da fama', 'homenagens', 'destaques'],
  },
  {
    id: 'noticias',
    path: '/noticias',
    label: 'Notícias',
    code: 'NT',
    description: 'Comunicados e acontecimentos do servidor.',
    ready: false,
    phase: 6,
    inNav: false,
    keywords: ['comunicados', 'anúncios', 'novidades'],
  },
];

export const navModules = modules.filter((m) => m.inNav);
export const moduleById = (id: string) => modules.find((m) => m.id === id);
