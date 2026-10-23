import type { MouseEvent, ReactNode } from 'react';
import { Starfield } from '@/components/effects/Starfield';
import { useSmoothScroll } from '@/components/effects/useSmoothScroll';
import { useLocation } from '@/router/router';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PreviewBanner } from './PreviewBanner';

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const admin = pathname === '/admin' || pathname.startsWith('/admin/');
  useSmoothScroll(!admin);

  // O painel administrativo ocupa a tela inteira, sem a navegação do site.
  if (admin) return <main id="conteudo">{children}</main>;

  // Não usa "#conteudo" no href para não conflitar com o roteador em modo hash.
  const skip = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.getElementById('conteudo');
    main?.focus();
    main?.scrollIntoView();
  };

  return (
    <>
      <a className="skip-link" href="#conteudo" onClick={skip}>
        Pular para o conteúdo
      </a>
      <Starfield />
      <PreviewBanner />
      <Navbar />
      <main id="conteudo" tabIndex={-1} style={{ outline: 'none' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
