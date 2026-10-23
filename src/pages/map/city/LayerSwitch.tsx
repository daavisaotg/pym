import type { CityLayer, CityLayerId } from '@/data/city';
import styles from './LayerSwitch.module.css';

interface Props {
  layers: CityLayer[];
  active: CityLayerId;
  onChange: (layer: CityLayerId) => void;
}

const order: CityLayerId[] = ['superior', 'cidade', 'inferioridade', 'campos'];

/** Elevador entre os níveis da cidade. Campos fica do outro lado do túnel. */
export function LayerSwitch({ layers, active, onChange }: Props) {
  const list = order.map((id) => layers.find((l) => l.id === id)).filter((l): l is CityLayer => Boolean(l));
  return (
    <nav className={styles.switch} aria-label="Camadas da cidade">
      <p className={`${styles.title} code`}>NÍVEIS</p>
      <ul>
        {list.map((l) => (
          <li key={l.id} data-sep={l.id === 'campos' || undefined}>
            <button type="button" className={styles.item} data-layer={l.id} aria-pressed={active === l.id} onClick={() => onChange(l.id)}>
              <span className={`${styles.level} code`}>{l.id === 'campos' ? 'TÚNEL' : l.level.replace('NÍVEL ', '')}</span>
              <span className={styles.name}>{l.name}</span>
              <span className={styles.short}>{l.short ?? l.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
