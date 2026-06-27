import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

interface PageContainerProps {
  children: ReactNode;
  padded?: boolean;
}

/** Standard page wrapper providing scroll + padding for tab content. */
export default function PageContainer({ children, padded = true }: PageContainerProps) {
  return <div className={`${styles.container} ${padded ? styles.padded : ''}`}>{children}</div>;
}
