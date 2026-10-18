import type { ReactNode } from 'react';
import styles from './MetricsBar.module.css';

interface MetricsBarProps {
  children?: ReactNode;
}

/** A sheet of figures; each child MetricCard is one cell. */
export function MetricsBar({ children }: MetricsBarProps) {
  return <div className={styles.sheet}>{children}</div>;
}
