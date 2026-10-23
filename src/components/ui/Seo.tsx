import site from '@/content/site.json';

interface SeoProps {
  title?: string;
  description?: string;
}

/**
 * Título e descrição por página. O React 19 move estas tags para o <head>.
 * Na fase de pré-renderização, elas também entram no HTML estático de cada rota.
 */
export function Seo({ title, description = site.description }: SeoProps) {
  const full = title ? `${title} | ${site.name}` : `${site.name} | ${site.title}`;
  return (
    <>
      <title>{full}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
    </>
  );
}
