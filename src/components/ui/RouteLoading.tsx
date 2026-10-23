import styles from './RouteLoading.module.css';

/** Mostrado enquanto o código de uma página é baixado. */
export function RouteLoading() {
  return (
    <div className={styles.wrap} role="status">
      <span className={styles.bar} />
      <span className={styles.text}>Abrindo registro</span>
    </div>
  );
}
