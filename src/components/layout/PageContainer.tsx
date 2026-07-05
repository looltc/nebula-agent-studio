import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

interface PageContainerProps {
  children: ReactNode;
  padded?: boolean;
  /** 去掉顶部 padding（用于带 sticky ContentHeader 的页面，避免标题上方留白） */
  flushTop?: boolean;
}

/** Standard page wrapper providing scroll + padding for tab content. */
export default function PageContainer({
  children,
  padded = true,
  flushTop = false,
}: PageContainerProps) {
  return (
    <div
      className={`${styles.container} ${padded ? styles.padded : ''} ${
        flushTop ? styles.flushTop : ''
      }`}
    >
      {children}
    </div>
  );
}
