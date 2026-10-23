import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { LogoUnfold } from '@/components/brand/LogoUnfold';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/router/router';
import { prefersReducedMotion } from '@/lib/asset';
import site from '@/content/site.json';
import { BootSequence, shouldBoot } from './BootSequence';
import styles from './Hero.module.css';

/** Relógio da sessão no canto do HUD (hora local do visitante). */
function SessionClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{now.toLocaleTimeString('pt-BR', { hour12: false })}</>;
}

export function Hero() {
  const [booting, setBooting] = useState(shouldBoot);
  const [play, setPlay] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const finishBoot = useCallback(() => setBooting(false), []);

  // Sem boot (visita repetida), o logo abre logo depois do primeiro quadro.
  useEffect(() => {
    if (booting) return;
    const raf = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(raf);
  }, [booting]);

  // Inclinação leve do logo acompanhando o ponteiro.
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion() || !stageRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    stageRef.current.style.setProperty('--tilt-y', `${x * 10}deg`);
    stageRef.current.style.setProperty('--tilt-x', `${-y * 8}deg`);
  };
  const onPointerLeave = () => {
    stageRef.current?.style.setProperty('--tilt-y', '0deg');
    stageRef.current?.style.setProperty('--tilt-x', '0deg');
  };

  return (
    <section className={styles.hero} data-play={play || undefined} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      {booting && <BootSequence onDone={finishBoot} />}

      <div className={styles.hud} aria-hidden="true">
        <span className={styles.corner} data-pos="tl" />
        <span className={styles.corner} data-pos="tr" />
        <span className={styles.corner} data-pos="bl" />
        <span className={styles.corner} data-pos="br" />
        <span className={`${styles.readout} ${styles.readoutLeft} code`}>ARQ-PYM / REGISTRO 0001</span>
        <span className={`${styles.readout} ${styles.readoutRight} code`}>
          <span className={styles.live} />
          SESSÃO <SessionClock />
        </span>
      </div>

      <div className={styles.center}>
        <div ref={stageRef} className={styles.logoWrap}>
          <LogoUnfold play={play} />
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">{site.name}: </span>
          {site.title}
        </h1>

        <p className={styles.lede}>{site.description}</p>

        <div className={styles.ctas}>
          <Button to={site.discordUrl} icon={<Icon name="discord" size={18} />}>
            Entrar no Discord
          </Button>
          <Button to="/multiverso" variant="ghost">
            Explorar o Multiverso
          </Button>
        </div>
      </div>

      <Link to="/#sobre" className={styles.cue}>
        <span>Ler o guia do PYM</span>
        <Icon name="arrow-down" size={16} />
      </Link>
    </section>
  );
}
