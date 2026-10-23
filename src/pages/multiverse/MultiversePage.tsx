import { useEffect, useMemo, useState } from 'react';
import { recordPath } from '@/app/paths';
import { useCollection, type Character } from '@/data';
import { Link, useNavigate, useParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { Icon } from '@/components/ui/Icon';
import { MultiverseMap, statusTone } from './MultiverseMap';
import { SidePanel } from './SidePanel';
import { EarthPanel } from './EarthPanel';
import { EventPanel } from './EventPanel';
import { Timeline } from './Timeline';
import styles from './Multiverse.module.css';

/** Espaço que o painel ocupa sobre o mapa, para a câmera centralizar no resto. */
function usePanelInset(open: boolean) {
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => {
    const on = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (!open) return { right: 0, bottom: 0 };
  if (vw >= 900) return { right: Math.min(540, vw * 0.42) + 24, bottom: 0 };
  return { right: 0, bottom: Math.round(vh * 0.58) };
}

export default function MultiversePage() {
  const params = useParams<{ '*': string }>();
  const navigate = useNavigate();
  const { data: earths } = useCollection('earths');
  const { data: events } = useCollection('events');
  const { data: characterList } = useCollection('characters');

  const characters = useMemo(() => new Map<string, Character>(characterList.map((c) => [c.id, c])), [characterList]);

  const rest = params['*'] ?? '';
  const eventSlug = rest.startsWith('eventos/') ? rest.slice('eventos/'.length) : undefined;
  const earthSlug = !eventSlug && rest ? rest : undefined;

  const earth = earths.find((e) => e.slug === earthSlug);
  const event = events.find((e) => e.slug === eventSlug);
  const open = Boolean(earth || event);
  const inset = usePanelInset(open);

  const selectEarth = (slug: string | null) => navigate(slug ? recordPath.earths(slug) : '/multiverso');
  const openEvent = (slug: string) => navigate(recordPath.events(slug));
  const close = () => navigate('/multiverso');

  // Esc fecha o painel (a busca global trava a rolagem e tem prioridade)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.documentElement.dataset.scrollLock !== undefined) return;
      navigate('/multiverso');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, navigate]);

  // Ao abrir um evento pela linha do tempo, sobe até o mapa onde o painel aparece.
  useEffect(() => {
    if (eventSlug) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [eventSlug]);

  const statuses = useMemo(() => [...new Set(earths.map((e) => e.status))], [earths]);

  const title = earth ? earth.name : event ? event.name : 'Multiverso';
  const description = earth?.summary ?? event?.summary ?? 'Mapa das Terras do PYM e linha do tempo dos grandes eventos do RP.';

  return (
    <div className={styles.page}>
      <Seo title={title} description={description} />

      <section className={styles.stage} aria-label="Mapa do Multiverso" data-open={open || undefined}>
        {earths.length > 0 && (
          <MultiverseMap
            earths={earths}
            selectedId={earth?.id}
            highlight={event?.earths}
            onSelect={(id) => selectEarth(id ? earths.find((e) => e.id === id)!.slug : null)}
            inset={inset}
          />
        )}

        <header className={styles.hud}>
          <p className={`${styles.kicker} code`}>MÓDULO MV</p>
          <h1 className={styles.h1}>Multiverso</h1>
          <p className={styles.lede}>
            {earths.length} {earths.length === 1 ? 'realidade catalogada' : 'realidades catalogadas'}. Escolha uma Terra para
            abrir a ficha.
          </p>
        </header>

        <div className={styles.footer}>
          <ul className={styles.legend} aria-label="Legenda de status">
            {statuses.map((s) => (
              <li key={s}>
                <span className={styles.dot} style={{ background: statusTone[s] }} />
                {s}
              </li>
            ))}
          </ul>
          <p className={styles.hint}>Arraste para mover. Ctrl + roda do mouse aproxima.</p>
          <Link to="/multiverso#linha-do-tempo" className={styles.toTimeline}>
            Linha do tempo <Icon name="arrow-down" size={14} />
          </Link>
        </div>

        {earth && (
          <SidePanel contentKey={earth.id} label={`Ficha de ${earth.name}`} onClose={close}>
            <EarthPanel
              earth={earth}
              earths={earths}
              events={events}
              characters={characters}
              onOpenEvent={openEvent}
              onSelectEarth={(slug) => selectEarth(slug)}
            />
          </SidePanel>
        )}
        {event && (
          <SidePanel contentKey={event.id} label={`Evento: ${event.name}`} onClose={close}>
            <EventPanel
              event={event}
              events={events}
              earths={earths}
              characters={characters}
              onOpenEvent={openEvent}
              onSelectEarth={(slug) => selectEarth(slug)}
            />
          </SidePanel>
        )}
      </section>

      <Timeline events={events} activeSlug={eventSlug} onOpen={openEvent} />
    </div>
  );
}
