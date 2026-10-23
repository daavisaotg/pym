import { modules } from '@/app/modules';
import { useLocation, useParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { InDevelopment } from '@/components/ui/InDevelopment';

/** Tela provisória de cada módulo até a fase dele ser entregue. */
export default function ModulePage() {
  const { pathname } = useLocation();
  const params = useParams<{ '*': string }>();
  const mod = modules.find((m) => pathname === m.path || pathname.startsWith(`${m.path}/`)) ?? modules[0];
  const requested = params['*'] || undefined;

  return (
    <>
      <Seo title={mod.label} description={mod.description} />
      <InDevelopment
        code={mod.code}
        title={mod.label}
        description={mod.description}
        requested={requested}
        note={`Previsto para a fase ${mod.phase} do roteiro do arquivo.`}
      />
    </>
  );
}
