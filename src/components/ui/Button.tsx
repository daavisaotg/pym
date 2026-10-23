import type { ReactNode } from 'react';
import { Link } from '@/router/router';
import styles from './Button.module.css';

interface ButtonProps {
  to: string;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'sm';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

/** Botão de navegação com o canto chanfrado do arquivo. Links externos abrem em nova aba. */
export function Button({ to, variant = 'primary', size = 'md', icon, children, className, ...rest }: ButtonProps) {
  return (
    <Link
      to={to}
      className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
    </Link>
  );
}
