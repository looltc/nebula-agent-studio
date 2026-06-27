import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  PanelLeft,
  Bell,
  CircleUser,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cx } from '@/lib/cx';
import type { ConnectionState } from '@/services/ws';
import styles from './TopBar.module.css';

const ROUTE_TITLES: Record<string, string> = {
  '/chat': 'Chat',
  '/agents': 'Agents',
  '/orchestration': 'Orchestration',
  '/observe': 'Observe',
  '/settings': 'Settings',
};

const CONN_META: Record<ConnectionState, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'connected' },
  reconnecting: { label: 'Reconnecting…', className: 'reconnecting' },
  disconnected: { label: 'Disconnected', className: 'disconnected' },
  degraded: { label: 'Degraded', className: 'degraded' },
};

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const connState = useUIStore((s) => s.connectionState);

  const title = ROUTE_TITLES[location.pathname] ?? 'Nebula Agent OS';
  const meta = CONN_META[connState];

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          className={styles.iconBtn}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Collapse/expand sidebar"
        >
          <PanelLeft size={18} />
        </button>
        <div className={styles.brand} onClick={() => navigate('/chat')}>
          <span className={styles.logo}>✦</span>
          <span className={styles.title}>Nebula Agent Studio</span>
        </div>
      </div>

      <div className={styles.center}>
        <span className={styles.breadcrumb}>{title}</span>
      </div>

      <div className={styles.right}>
        <div className={styles.conn} title={meta.label}>
          <span className={cx(styles.dot, styles[meta.className])} />
          <span className={styles.connLabel}>{meta.label}</span>
        </div>
        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className={styles.iconBtn} aria-label="Notifications" title="Notifications">
          <Bell size={18} />
        </button>
        <button className={styles.iconBtn} aria-label="Account" title="Account">
          <CircleUser size={18} />
        </button>
      </div>
    </header>
  );
}
