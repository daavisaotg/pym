import { JsonRepository, type ContentRepository } from './repository';

/** Ponto único de acesso ao conteúdo do arquivo. Troque a implementação aqui. */
export const content: ContentRepository = new JsonRepository();
